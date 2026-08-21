import type { ImmutableAssignment, Meal, MealType, ParsedTable, Participant } from './types';

function normalize(value: string | undefined): string {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function detectDelimiter(headerLine: string): string {
  const candidates = ['\t', ';', '|', ','];
  let best = ',';
  let bestCount = -1;
  for (const delimiter of candidates) {
    const count = headerLine.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }
  return best;
}

function isSeparatorRow(line: string): boolean {
  return /^[\s|:-]+$/.test(line) && /-/.test(line);
}

function splitRow(line: string, delimiter: string): string[] {
  const cells = line.split(delimiter).map((cell) => cell.trim());
  if (delimiter === '|') {
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
  }
  return cells;
}

/** True for a header label ending in "dîner" or "déj." (accent/case/trailing-dot insensitive). */
function isMealHeader(normalizedLabel: string): boolean {
  const trimmed = normalizedLabel.replace(/\.+$/, '');
  return trimmed.endsWith('diner') || trimmed.endsWith('dej');
}

const NUMERIC_NAME = /^-?\d+([.,]\d+)?$/;

/** Labels found in summary/junk rows pasted between the MIAM table and the tâcheronnage table. */
const JUNK_NAME_TOKENS = new Set([
  'total',
  'nb personnes',
  'nombre de personnes',
  'nb dodos',
  'nombre de dodos',
  'tacherons requis',
  'tacheron requis',
  'chef de brigade',
  'nuit de',
]);

function isRealName(name: string): boolean {
  if (!name) return false;
  if (NUMERIC_NAME.test(name)) return false;
  return !JUNK_NAME_TOKENS.has(normalize(name));
}

interface MealColumn {
  index: number;
  label: string;
}

/**
 * Parses a pasted spreadsheet table, tolerating extra/irrelevant columns and rows.
 * Only Nom, Horaire, Chefferie, Exempté and columns ending in "dîner"/"déj." are kept.
 * Below the MIAM table, a "tâcheronnage" sub-table (chef de brigade + tâcherons per meal,
 * named directly inside the meal columns) is detected and reported as immutable assignments.
 */
export function parseTable(text: string): ParsedTable {
  let lines = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Colle au moins un en-tête et une ligne de participant.');
  }
  lines = lines.filter((line) => !isSeparatorRow(line));

  const delim = detectDelimiter(lines[0]);
  const header = splitRow(lines[0], delim);

  let nomIdx = -1;
  let horaireIdx = -1;
  let chefferieIdx = -1;
  let exemptIdx = -1;
  const mealCols: MealColumn[] = [];

  header.forEach((raw, i) => {
    const n = normalize(raw);
    if (!n) return;
    if (n === 'nom' && nomIdx === -1) {
      nomIdx = i;
    } else if (n === 'horaire' && horaireIdx === -1) {
      horaireIdx = i;
    } else if (n === 'chefferie' && chefferieIdx === -1) {
      chefferieIdx = i;
    } else if ((n === 'exempte' || n === 'exempt') && exemptIdx === -1) {
      exemptIdx = i;
    } else if (isMealHeader(n)) {
      mealCols.push({ index: i, label: raw.trim() });
    }
  });

  if (nomIdx === -1) {
    throw new Error('Colonne « Nom » introuvable.');
  }
  if (mealCols.length === 0) {
    throw new Error('Aucune colonne de repas détectée (doit finir par « dîner » ou « déj. »).');
  }

  const meals: Meal[] = mealCols.map((mc, i) => {
    const n = normalize(mc.label).replace(/\.+$/, '');
    const type: MealType = n.endsWith('dej') ? 'dej' : 'diner';
    return { label: mc.label, type, col: i, day: 0 };
  });

  let day = -1;
  let lastType: Meal['type'] | null = null;
  for (const meal of meals) {
    if (meal.type === 'dej') {
      day++;
    } else if (lastType !== 'dej') {
      day++;
    }
    meal.day = day;
    lastType = meal.type;
  }

  const dataLines = lines.slice(1);
  const participants: Participant[] = [];
  const isParticipantRow: boolean[] = [];

  for (const line of dataLines) {
    const cells = splitRow(line, delim);
    const nameRaw = (cells[nomIdx] ?? '').trim();

    const mealCellsOk = mealCols.every(({ index }) => {
      const v = normalize(cells[index]);
      return v === '' || v.includes('miam');
    });
    const participantRow = isRealName(nameRaw) && mealCellsOk;
    isParticipantRow.push(participantRow);
    if (!participantRow) continue;

    const horaireNorm = normalize(cells[horaireIdx]);
    const horaire =
      horaireNorm === ''
        ? 'indiff'
        : horaireNorm.includes('dej')
          ? 'dej'
          : horaireNorm.includes('din')
            ? 'diner'
            : 'indiff';
    const chefNorm = normalize(cells[chefferieIdx]);
    const chef =
      chefNorm === ''
        ? 'jamais'
        : chefNorm.includes('jamais')
          ? 'jamais'
          : chefNorm.includes('toujours')
            ? 'toujours'
            : chefNorm.includes('fois')
              ? 'unefois'
              : 'jamais';
    const exempt = normalize(cells[exemptIdx]) === 'true';

    const attends = mealCols.map(({ index }) => normalize(cells[index]).includes('miam'));
    const mealIdx: number[] = [];
    attends.forEach((a, i) => {
      if (a) mealIdx.push(i);
    });

    participants.push({
      name: nameRaw,
      horaire,
      chef,
      exempt,
      attends,
      mealIdx,
      miamCount: mealIdx.length,
      firstIdx: mealIdx.length ? mealIdx[0] : -1,
      lastIdx: mealIdx.length ? mealIdx[mealIdx.length - 1] : -1,
      immutable: [],
    });
  }

  // Tâcheronnage sub-table: for rows without a Nom, a name inside a meal column is an
  // immutable assignment for that meal — the first one found is the chef, the rest tâcherons.
  const immutables: ImmutableAssignment[] = [];
  const chefAssigned: boolean[] = mealCols.map(() => false);
  dataLines.forEach((line, li) => {
    if (isParticipantRow[li]) return;
    const cells = splitRow(line, delim);
    mealCols.forEach((mc, mi) => {
      const raw = (cells[mc.index] ?? '').trim();
      if (!raw) return;
      const n = normalize(raw);
      if (n.includes('miam') || NUMERIC_NAME.test(raw)) return;

      const role = chefAssigned[mi] ? 'tacheron' : 'chef';
      chefAssigned[mi] = true;
      const participantIdx = participants.findIndex((p) => normalize(p.name) === n);
      immutables.push({ mealIdx: mi, name: raw, participantIdx, role });
      if (participantIdx >= 0) participants[participantIdx].immutable.push({ mealIdx: mi, role });
    });
  });

  return { meals, participants, delim, immutables };
}
