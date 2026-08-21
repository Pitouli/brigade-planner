import type { Model, ParsedTable } from './types';

/** Builds the per-meal brigade sizes and per-person cook-count targets from the parsed table. */
export function buildModel(parsed: ParsedTable, ratio: number): Model {
  const { meals, participants } = parsed;
  const mealAttendees: number[][] = meals.map(() => []);
  participants.forEach((p, pi) => {
    for (const mi of p.mealIdx) {
      mealAttendees[mi].push(pi);
    }
  });

  const brigadeSize = meals.map((_, i) => {
    const n = mealAttendees[i].length;
    if (n === 0) return 0;
    return Math.min(n, Math.max(1, Math.round(ratio * n)));
  });

  const targets = participants.map((p) => ratio * p.miamCount);

  return { mealAttendees, brigadeSize, targets };
}
