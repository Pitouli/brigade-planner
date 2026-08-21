import type { Model, ParsedTable } from './types';

/** Builds the per-meal brigade sizes, cook-eligible pools and immutable (tâcheronnage) placements. */
export function buildModel(parsed: ParsedTable, ratio: number): Model {
  const { meals, participants, immutables } = parsed;
  const mealAttendees: number[][] = meals.map(() => []);
  const eligibleAttendees: number[][] = meals.map(() => []);
  participants.forEach((p, pi) => {
    for (const mi of p.mealIdx) {
      mealAttendees[mi].push(pi);
      if (!p.exempt) eligibleAttendees[mi].push(pi);
    }
  });

  // A tâcheronnage entry stays eligible for its own meal even if the person is exempted.
  const immutableChef: (number | null)[] = meals.map(() => null);
  const immutableCooks: number[][] = meals.map(() => []);
  for (const a of immutables) {
    if (a.participantIdx < 0) continue;
    immutableCooks[a.mealIdx].push(a.participantIdx);
    if (a.role === 'chef') immutableChef[a.mealIdx] = a.participantIdx;
    if (!eligibleAttendees[a.mealIdx].includes(a.participantIdx)) {
      eligibleAttendees[a.mealIdx].push(a.participantIdx);
    }
  }

  const brigadeSize = meals.map((_, i) => {
    const n = mealAttendees[i].length;
    const base = n === 0 ? 0 : Math.min(n, Math.max(1, Math.round(ratio * n)));
    const eligibleN = eligibleAttendees[i].length;
    const capped = eligibleN > 0 ? Math.min(base, eligibleN) : base;
    return Math.max(capped, immutableCooks[i].length);
  });

  const targets = participants.map((p) => ratio * p.miamCount);

  return { mealAttendees, eligibleAttendees, brigadeSize, targets, immutableChef, immutableCooks };
}
