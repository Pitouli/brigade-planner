import type { OptimizationRun, ParsedTable } from '../engine/types';

export function runToText(run: OptimizationRun, parsed: ParsedTable): string {
  const P = parsed.participants;
  let out = `RÉPARTITION #${run.id} (score ${run.detail.score.toFixed(1)}, ratio ${run.ratio})\n\n`;
  run.genome.forEach((brigade, mi) => {
    if (!brigade.cooks.length) return;
    const meal = parsed.meals[mi];
    const chef = brigade.chef >= 0 ? P[brigade.chef].name : '—';
    const others = brigade.cooks
      .filter((i) => i !== brigade.chef)
      .map((i) => P[i].name)
      .join(', ');
    out += `${meal.label}\n  Chef : ${chef}\n  Tâcherons : ${others || '—'}\n`;
  });
  return out;
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
