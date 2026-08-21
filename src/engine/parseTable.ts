import type { Meal, ParsedTable, Participant } from './types';

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

/** Parses a pasted spreadsheet table (Nom, Horaire, Chefferie, then one "Miam" column per meal). */
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
  const mealLabels = header.slice(3);

  const meals: Meal[] = mealLabels.map((label, i) => {
    const n = normalize(label);
    const type = n.includes('dej') ? 'dej' : 'diner';
    return { label, type, col: i, day: 0 };
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

  const participants: Participant[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitRow(lines[r], delim);
    if (!cells[0] || cells[0].trim() === '') continue;

    const name = cells[0].trim();
    const horaireNorm = normalize(cells[1]);
    const horaire = horaireNorm.includes('dej')
      ? 'dej'
      : horaireNorm.includes('din')
        ? 'diner'
        : 'indiff';
    const chefNorm = normalize(cells[2]);
    const chef = chefNorm.includes('jamais')
      ? 'jamais'
      : chefNorm.includes('toujours')
        ? 'toujours'
        : chefNorm.includes('fois')
          ? 'unefois'
          : 'indiff';

    const attends = meals.map((_, i) => normalize(cells[3 + i]).includes('miam'));
    const mealIdx: number[] = [];
    attends.forEach((a, i) => {
      if (a) mealIdx.push(i);
    });

    participants.push({
      name,
      horaire,
      chef,
      attends,
      mealIdx,
      miamCount: mealIdx.length,
      firstIdx: mealIdx.length ? mealIdx[0] : -1,
      lastIdx: mealIdx.length ? mealIdx[mealIdx.length - 1] : -1,
    });
  }

  return { meals, participants, delim };
}
