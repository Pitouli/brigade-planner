import { buildModel } from './model';
import type {
  Brigade,
  BrigadeAlgoSettings,
  EvaluationResult,
  GaSettings,
  Genome,
  Model,
  ParsedTable,
  Weights,
} from './types';

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function pick<T>(arr: T[]): T {
  return arr[randInt(arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Builds a brigade for meal `mi`, always keeping its immutable chef/tâcherons (if any) in place. */
function randomBrigade(mi: number, model: Model, parsed: ParsedTable): Brigade {
  const { eligibleAttendees, brigadeSize, immutableChef, immutableCooks } = model;
  const forced = immutableCooks[mi];
  const extraCount = Math.max(0, brigadeSize[mi] - forced.length);
  const pool = shuffle(eligibleAttendees[mi].filter((x) => !forced.includes(x)));
  const cooks = forced.concat(pool.slice(0, extraCount));

  let chef = immutableChef[mi];
  if (chef == null) {
    const willing = cooks.filter((i) => parsed.participants[i].chef !== 'jamais');
    chef = willing.length ? pick(willing) : cooks.length ? pick(cooks) : -1;
  }
  return { cooks, chef };
}

export function initGenome(model: Model, parsed: ParsedTable, firstOptimizableMeal = 1): Genome {
  const firstOptimizableIndex = Math.max(0, Math.floor(firstOptimizableMeal) - 1);
  return parsed.meals.map((_, i) => {
    if (i < firstOptimizableIndex) {
      return {
        cooks: model.immutableCooks[i].slice(),
        chef: model.immutableChef[i] ?? -1,
      };
    }
    return model.brigadeSize[i] === 0 && model.immutableCooks[i].length === 0
      ? { cooks: [], chef: -1 }
      : randomBrigade(i, model, parsed);
  });
}

function cloneGenome(genome: Genome): Genome {
  return genome.map((b) => ({ cooks: b.cooks.slice(), chef: b.chef }));
}

function freezePastMeals(genome: Genome, model: Model, firstOptimizableMeal: number): Genome {
  const firstOptimizableIndex = Math.max(0, Math.floor(firstOptimizableMeal) - 1);
  for (let mi = 0; mi < firstOptimizableIndex; mi++) {
    genome[mi] = {
      cooks: model.immutableCooks[mi].slice(),
      chef: model.immutableChef[mi] ?? -1,
    };
  }
  return genome;
}

function similarity(a: Genome, b: Genome): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i].cooks.length && !b[i].cooks.length) continue;
    n++;
    const setA = new Set(a[i].cooks);
    const setB = new Set(b[i].cooks);
    let inter = 0;
    setA.forEach((x) => {
      if (setB.has(x)) inter++;
    });
    const union = setA.size + setB.size - inter;
    const jaccard = union ? inter / union : 1;
    sum += 0.7 * jaccard + 0.3 * (a[i].chef === b[i].chef ? 1 : 0);
  }
  return n ? sum / n : 0;
}

/** Variance of the gaps between consecutive positions ; 0 means perfectly even spacing. */
function gapVariance(positions: number[]): number {
  if (positions.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length;
}

export function evaluate(
  genome: Genome,
  model: Model,
  parsed: ParsedTable,
  weights: Weights,
  previousGenomes: Genome[] | null,
  detail: boolean,
): EvaluationResult {
  const { participants, meals } = parsed;
  const { targets } = model;
  const P = participants.length;

  const cookCount = new Array(P).fill(0);
  const chefCount = new Array(P).fill(0);
  const perDay: Record<number, number>[] = participants.map(() => ({}));
  // Position of each task within the participant's own attended-meals sequence, in chronological order.
  const taskPositions: number[][] = participants.map(() => []);
  const chefFlags: boolean[][] = participants.map(() => []);
  const mealPositionByParticipant: Map<number, number>[] = participants.map((p) => {
    const m = new Map<number, number>();
    p.mealIdx.forEach((mi, idx) => {
      m.set(mi, idx);
    });
    return m;
  });
  const violations: EvaluationResult['violations'] = [];
  let score = 0;

  const presenceWeight = (pi: number) => 1 / Math.max(0.5, targets[pi]);

  genome.forEach((brigade, mi) => {
    const meal = meals[mi];
    brigade.cooks.forEach((pi) => {
      cookCount[pi]++;
      const d = meal.day;
      perDay[pi][d] = (perDay[pi][d] || 0) + 1;
      taskPositions[pi].push(mealPositionByParticipant[pi].get(mi) ?? 0);
      chefFlags[pi].push(brigade.chef === pi);

      const pref = participants[pi].horaire;
      if (pref !== 'indiff' && pref !== meal.type) {
        score += weights.horaire * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'horaire',
            text: `${participants[pi].name} préfère ${pref === 'dej' ? 'le midi' : 'le soir'}, mais est de corvée à « ${meal.label} »`,
          });
        }
      }
      if (mi === participants[pi].firstIdx) {
        score += weights.firstLast * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'firstlast',
            text: `${participants[pi].name} tâcheronne son PREMIER repas (« ${meal.label} »)`,
          });
        }
      }
      if (mi === participants[pi].lastIdx) {
        score += weights.firstLast * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'firstlast',
            text: `${participants[pi].name} tâcheronne son DERNIER repas (« ${meal.label} »)`,
          });
        }
      }
    });
    if (brigade.chef >= 0) chefCount[brigade.chef]++;
  });

  participants.forEach((p, pi) => {
    for (const d in perDay[pi]) {
      const c = perDay[pi][d];
      if (c > 1) {
        score += weights.sameDay * (c - 1) * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'sameday',
            text: `${p.name} tâcheronne ${c} fois le même jour (jour ${Number(d) + 1})`,
          });
        }
      }
    }
  });

  participants.forEach((p, pi) => {
    const dev = cookCount[pi] - targets[pi];
    score += weights.targetPerson * dev * dev * presenceWeight(pi);
    if (detail && Math.abs(dev) >= 1) {
      violations.push({
        type: 'target',
        text: `${p.name} : ${cookCount[pi]} corvée(s) pour ~${targets[pi].toFixed(1)} visé (${p.miamCount} miams)`,
      });
    }
  });

  if (weights.spreadTasks > 0) {
    participants.forEach((p, pi) => {
      const positions = taskPositions[pi];
      const taskVariance = gapVariance(positions);
      if (taskVariance > 0) {
        score += weights.spreadTasks * taskVariance * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'spread',
            text: `${p.name} : tâches peu étalées dans le temps (variance des écarts ${taskVariance.toFixed(2)})`,
          });
        }
      }

      const chefIndexes = chefFlags[pi]
        .map((isChef, idx) => (isChef ? idx : -1))
        .filter((idx) => idx >= 0);
      const chefVariance = gapVariance(chefIndexes);
      if (chefVariance > 0) {
        score += weights.spreadTasks * chefVariance * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'spread',
            text: `${p.name} : jours de chefferie mal étalés parmi ses tâches (variance ${chefVariance.toFixed(2)})`,
          });
        }
      }
    });
  }

  participants.forEach((p, pi) => {
    if (p.chef === 'jamais' && chefCount[pi] > 0) {
      score += weights.chefJamais * chefCount[pi] * presenceWeight(pi);
      if (detail) {
        violations.push({
          type: 'chef',
          text: `${p.name} ne veut JAMAIS cheffer, mais est chef ${chefCount[pi]} fois`,
        });
      }
    } else if (p.chef === 'unefois') {
      const dev = chefCount[pi] - 1;
      score += weights.chefUnefois * dev * dev * presenceWeight(pi);
      if (detail && dev !== 0) {
        violations.push({
          type: 'chef',
          text: `${p.name} veut cheffer UNE fois, mais cheffe ${chefCount[pi]} fois`,
        });
      }
    } else if (p.chef === 'toujours') {
      const missingMinimum = cookCount[pi] > 0 && chefCount[pi] === 0;
      if (missingMinimum) {
        score += weights.chefToujours * presenceWeight(pi);
        if (detail) {
          violations.push({
            type: 'chef',
            text: `${p.name} a répondu « TOUJOURS » mais n’est jamais chef ; objectif minimum : 1 fois`,
          });
        }
      }
    }
  });

  const alwaysChef = participants
    .map((p, pi) => ({ p, pi }))
    .filter(({ p, pi }) => p.chef === 'toujours' && cookCount[pi] > 0);
  if (alwaysChef.length >= 2) {
    const totalCook = alwaysChef.reduce((sum, { pi }) => sum + cookCount[pi], 0);
    const totalChef = alwaysChef.reduce((sum, { pi }) => sum + chefCount[pi], 0);
    const meanRate = totalCook > 0 ? totalChef / totalCook : 0;

    let imbalance = 0;
    alwaysChef.forEach(({ pi }) => {
      const rate = chefCount[pi] / cookCount[pi];
      const diff = rate - meanRate;
      // Weighted by task count to keep the criterion proportional to each person's load.
      imbalance += cookCount[pi] * diff * diff;
    });

    if (imbalance > 0) {
      score += weights.chefToujours * imbalance;
      if (detail) {
        const highest = alwaysChef.reduce((best, current) =>
          chefCount[current.pi] / cookCount[current.pi] > chefCount[best.pi] / cookCount[best.pi]
            ? current
            : best,
        );
        alwaysChef.forEach(({ p, pi }) => {
          const rate = chefCount[pi] / cookCount[pi];
          const highestRate = chefCount[highest.pi] / cookCount[highest.pi];
          if (chefCount[pi] === 0 || highestRate - rate >= 0.25) {
            violations.push({
              type: 'chef',
              text: `${p.name} est anormalement moins chef que ${highest.p.name} parmi les profils « TOUJOURS » (${chefCount[pi]}/${cookCount[pi]} vs ${chefCount[highest.pi]}/${cookCount[highest.pi]})`,
            });
          }
        });
      }
    }
  }

  if (previousGenomes?.length && weights.novelty > 0) {
    let sum = 0;
    for (const prev of previousGenomes) sum += similarity(genome, prev);
    score += weights.novelty * (sum / previousGenomes.length) * genome.length;
  }

  return { score, violations, cookCount, chefCount, targets };
}

/** Mutates cooks/chef per meal, never touching the immutable chef/tâcherons forced by the tâcheronnage table. */
function mutate(
  genome: Genome,
  model: Model,
  parsed: ParsedTable,
  rate: number,
  firstOptimizableMeal: number,
): Genome {
  const g = cloneGenome(genome);
  const { eligibleAttendees, brigadeSize, immutableChef, immutableCooks } = model;
  const firstOptimizableIndex = Math.max(0, Math.floor(firstOptimizableMeal) - 1);

  for (let mi = 0; mi < g.length; mi++) {
    if (mi < firstOptimizableIndex) continue;
    const forced = immutableCooks[mi];
    if (brigadeSize[mi] === 0 && forced.length === 0) continue;
    if (Math.random() >= rate) continue;

    const brigade = g[mi];
    const attendees = eligibleAttendees[mi];
    const freeSlots = brigade.cooks
      .map((_, idx) => idx)
      .filter((idx) => !forced.includes(brigade.cooks[idx]));
    if (!freeSlots.length) continue;

    if (Math.random() < 0.6 && attendees.length > brigade.cooks.length) {
      const nonCooks = attendees.filter((x) => !brigade.cooks.includes(x));
      if (nonCooks.length) {
        const pos = pick(freeSlots);
        const wasChef = brigade.cooks[pos] === brigade.chef;
        brigade.cooks[pos] = pick(nonCooks);
        if (wasChef && immutableChef[mi] == null) {
          const willing = brigade.cooks.filter((i) => parsed.participants[i].chef !== 'jamais');
          brigade.chef = willing.length ? pick(willing) : pick(brigade.cooks);
        }
      }
    } else if (immutableChef[mi] == null) {
      brigade.chef = pick(brigade.cooks);
    }
  }
  return g;
}

function crossover(a: Genome, b: Genome): Genome {
  return a.map((brigadeA, i) =>
    Math.random() < 0.5
      ? { cooks: brigadeA.cooks.slice(), chef: brigadeA.chef }
      : { cooks: b[i].cooks.slice(), chef: b[i].chef },
  );
}

interface ScoredGenome {
  g: Genome;
  s: number;
}

function tournamentSelect(scored: ScoredGenome[], k: number): Genome {
  let best: ScoredGenome | null = null;
  for (let i = 0; i < k; i++) {
    const candidate = scored[randInt(scored.length)];
    if (!best || candidate.s < best.s) best = candidate;
  }
  return (best as ScoredGenome).g;
}

export interface GaResult {
  genome: Genome;
  model: Model;
  detail: EvaluationResult;
}

export type RunProgressCallback = (current: number, total: number) => void;

/** Runs the genetic algorithm and returns the best genome found along with its evaluation detail. */
export function runGA(
  parsed: ParsedTable,
  algo: BrigadeAlgoSettings,
  weights: Weights,
  ga: GaSettings,
  previousGenomes: Genome[],
  onProgress?: RunProgressCallback,
): GaResult {
  const model = buildModel(parsed, algo, ga.firstOptimizableMeal ?? 1);
  const { popSize, generations, mutRate, tournament, elite, firstOptimizableMeal = 1 } = ga;

  const scoreOf = (g: Genome) => evaluate(g, model, parsed, weights, previousGenomes, false).score;

  let scored: ScoredGenome[] = Array.from({ length: popSize }, () => {
    const g = initGenome(model, parsed, firstOptimizableMeal);
    return { g, s: scoreOf(g) };
  });

  for (let gen = 0; gen < generations; gen++) {
    onProgress?.(gen + 1, generations);
    scored.sort((a, b) => a.s - b.s);
    const next: Genome[] = [];
    for (let e = 0; e < elite; e++) next.push(scored[e].g);
    while (next.length < popSize) {
      const p1 = tournamentSelect(scored, tournament);
      const p2 = tournamentSelect(scored, tournament);
      const child = mutate(crossover(p1, p2), model, parsed, mutRate, firstOptimizableMeal);
      next.push(freezePastMeals(child, model, firstOptimizableMeal));
    }
    scored = next.map((g) => ({ g, s: scoreOf(g) }));
  }

  onProgress?.(generations, generations);

  scored.sort((a, b) => a.s - b.s);
  const best = scored[0].g;
  const detail = evaluate(best, model, parsed, weights, null, true);
  return { genome: best, model, detail };
}
