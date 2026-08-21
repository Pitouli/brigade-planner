import type { OptimizationRun, ParsedTable } from '../engine/types';

export function runToText(run: OptimizationRun, parsed: ParsedTable): string {
  const P = parsed.participants;
  const meals = parsed.meals.filter((_, mi) => run.genome[mi]?.cooks.length);

  if (meals.length === 0) return '';

  const rows: string[][] = [];
  const maxCrew = Math.max(...meals.map((_, mi) => run.genome[mi]?.cooks.length ?? 0), 0);

  rows.push(
    meals.map((_, mi) => {
      const brigade = run.genome[mi];
      return brigade && brigade.chef >= 0 ? P[brigade.chef].name : '';
    }),
  );

  for (let rowIdx = 1; rowIdx < maxCrew; rowIdx += 1) {
    rows.push(
      meals.map((_, mi) => {
        const brigade = run.genome[mi];
        if (!brigade) return '';
        const others = brigade.cooks.filter((i) => i !== brigade.chef).map((i) => P[i].name);
        return others[rowIdx - 1] ?? '';
      }),
    );
  }

  return rows.map((row) => row.join('\t')).join('\n');
}

export function downloadRunCsv(run: OptimizationRun, parsed: ParsedTable): void {
  const P = parsed.participants;
  const rows: string[][] = [['Repas', 'Type', 'Jour', 'Chef', 'Tacherons']];
  run.genome.forEach((brigade, mi) => {
    if (!brigade.cooks.length) return;
    const meal = parsed.meals[mi];
    const chef = brigade.chef >= 0 ? P[brigade.chef].name : '';
    const others = brigade.cooks
      .filter((i) => i !== brigade.chef)
      .map((i) => P[i].name)
      .join(' | ');
    rows.push([meal.label, meal.type, `J${meal.day + 1}`, chef, others]);
  });

  const csv = rows
    .map((row) =>
      row.map((cell) => (/[;\n"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(';'),
    )
    .join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `brigades_${run.id}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
