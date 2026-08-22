import type { BrigadeAlgoSettings, Model, ParsedTable } from './types';

/** Applies the « Formule »/« Paramètre X » sizing to a meal's attendee count, then clamps it. */
function computeMealSize(n: number, algo: BrigadeAlgoSettings): number {
  if (n === 0) return 0;
  const raw =
    algo.formula === 'linear' ? algo.paramX * n : algo.paramX > 0 ? n ** (1 / algo.paramX) : n;
  const withMin = Math.max(Math.round(raw), algo.minTacherons, 1);
  return Math.min(withMin, algo.maxTacherons, n);
}

/** Builds the per-meal brigade sizes, cook-eligible pools and immutable (tâcheronnage) placements. */
export function buildModel(
  parsed: ParsedTable,
  algo: BrigadeAlgoSettings,
  firstOptimizableMeal = 1,
): Model {
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

  // Meals before the optimization threshold keep exactly their declared tâcheronnage (step 2).
  const firstOptimizableIndex = Math.max(0, Math.floor(firstOptimizableMeal) - 1);
  const brigadeSize = meals.map((_, i) => {
    if (i < firstOptimizableIndex) return immutableCooks[i].length;
    const n = mealAttendees[i].length;
    const base = computeMealSize(n, algo);
    const eligibleN = eligibleAttendees[i].length;
    const capped = eligibleN > 0 ? Math.min(base, eligibleN) : base;
    // Bump the headcount if the declared immuables for this meal exceed the computed size (step 1).
    return Math.max(capped, immutableCooks[i].length);
  });

  // Total tâches needed for the "semaine" (step 3), prorated per participant by their miam share (step 4).
  const totalTasks = brigadeSize.reduce((sum, n) => sum + n, 0);
  const totalMiam = participants.reduce((sum, p) => sum + p.miamCount, 0);
  const targets = participants.map((p) => {
    if (p.exempt) return p.immutable.length;
    return totalMiam > 0 ? (p.miamCount / totalMiam) * totalTasks : 0;
  });

  return { mealAttendees, eligibleAttendees, brigadeSize, targets, immutableChef, immutableCooks };
}
