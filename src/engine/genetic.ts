import { buildModel } from './model';
import type {
  Brigade,
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

export function initGenome(model: Model, parsed: ParsedTable): Genome {
  return parsed.meals.map((_, i) =>
    model.brigadeSize[i] === 0 && model.immutableCooks[i].length === 0
      ? { cooks: [], chef: -1 }
      : randomBrigade(i, model, parsed),
  );
}

function cloneGenome(genome: Genome): Genome {
  return genome.map((b) => ({ cooks: b.cooks.slice(), chef: b.chef }));
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
  const violations: EvaluationResult['violations'] = [];
  let score = 0;

  genome.forEach((brigade, mi) => {
    const meal = meals[mi];
    brigade.cooks.forEach((pi) => {
      cookCount[pi]++;
      const d = meal.day;
      perDay[pi][d] = (perDay[pi][d] || 0) + 1;

      const pref = participants[pi].horaire;
      if (pref !== 'indiff' && pref !== meal.type) {
        score += weights.horaire;
        if (detail) {
          violations.push({
            type: 'horaire',
            text: `${participants[pi].name} préfère ${pref === 'dej' ? 'le midi' : 'le soir'}, mais est de corvée à « ${meal.label} »`,
          });
        }
      }
      if (mi === participants[pi].firstIdx) {
        score += weights.firstLast;
        if (detail) {
          violations.push({
            type: 'firstlast',
            text: `${participants[pi].name} tâcheronne son PREMIER repas (« ${meal.label} »)`,
          });
        }
      }
      if (mi === participants[pi].lastIdx) {
        score += weights.firstLast;
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
        score += weights.sameDay * (c - 1);
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
    score += weights.targetPerson * dev * dev;
    if (detail && Math.abs(dev) >= 1) {
      violations.push({
        type: 'target',
        text: `${p.name} : ${cookCount[pi]} corvée(s) pour ~${targets[pi].toFixed(1)} visé (${p.miamCount} miams)`,
      });
    }
  });

  participants.forEach((p, pi) => {
    if (p.chef === 'jamais' && chefCount[pi] > 0) {
      score += weights.chefJamais * chefCount[pi];
      if (detail) {
        violations.push({
          type: 'chef',
          text: `${p.name} ne veut JAMAIS cheffer, mais est chef ${chefCount[pi]} fois`,
        });
      }
    } else if (p.chef === 'unefois') {
      const dev = chefCount[pi] - 1;
      score += weights.chefUnefois * dev * dev;
      if (detail && dev !== 0) {
        violations.push({
          type: 'chef',
          text: `${p.name} veut cheffer UNE fois, mais cheffe ${chefCount[pi]} fois`,
        });
      }
    } else if (p.chef === 'toujours') {
      const missed = cookCount[pi] - chefCount[pi];
      if (missed > 0) {
        score += weights.chefToujours * missed;
        if (detail) {
          violations.push({
            type: 'chef',
            text: `${p.name} veut TOUJOURS cheffer, mais est simple tâcheron ${missed} fois`,
          });
        }
      }
    }
  });

  if (previousGenomes?.length && weights.novelty > 0) {
    let sum = 0;
    for (const prev of previousGenomes) sum += similarity(genome, prev);
    score += weights.novelty * (sum / previousGenomes.length) * genome.length;
  }

  return { score, violations, cookCount, chefCount };
}

/** Mutates cooks/chef per meal, never touching the immutable chef/tâcherons forced by the tâcheronnage table. */
function mutate(genome: Genome, model: Model, parsed: ParsedTable, rate: number): Genome {
  const g = cloneGenome(genome);
  const { eligibleAttendees, brigadeSize, immutableChef, immutableCooks } = model;

  for (let mi = 0; mi < g.length; mi++) {
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

/** Runs the genetic algorithm and returns the best genome found along with its evaluation detail. */
export function runGA(
  parsed: ParsedTable,
  ratio: number,
  weights: Weights,
  ga: GaSettings,
  previousGenomes: Genome[],
): GaResult {
  const model = buildModel(parsed, ratio);
  const { popSize, generations, mutRate, tournament, elite } = ga;

  const scoreOf = (g: Genome) => evaluate(g, model, parsed, weights, previousGenomes, false).score;

  let scored: ScoredGenome[] = Array.from({ length: popSize }, () => {
    const g = initGenome(model, parsed);
    return { g, s: scoreOf(g) };
  });

  for (let gen = 0; gen < generations; gen++) {
    scored.sort((a, b) => a.s - b.s);
    const next: Genome[] = [];
    for (let e = 0; e < elite; e++) next.push(scored[e].g);
    while (next.length < popSize) {
      const p1 = tournamentSelect(scored, tournament);
      const p2 = tournamentSelect(scored, tournament);
      next.push(mutate(crossover(p1, p2), model, parsed, mutRate));
    }
    scored = next.map((g) => ({ g, s: scoreOf(g) }));
  }

  scored.sort((a, b) => a.s - b.s);
  const best = scored[0].g;
  const detail = evaluate(best, model, parsed, weights, null, true);
  return { genome: best, model, detail };
}
