import { describe, expect, it } from 'vitest';
import { evaluate, initGenome, runGA } from './genetic';
import { buildModel } from './model';
import { parseTable } from './parseTable';
import {
  type BrigadeAlgoSettings,
  DEFAULT_GA_SETTINGS,
  DEFAULT_WEIGHTS,
  type ParsedTable,
} from './types';

const algo = (paramX: number): BrigadeAlgoSettings => ({
  formula: 'linear',
  paramX,
  minTacherons: 0,
  maxTacherons: 100,
});

const CSV = [
  'Nom;Horaire;Chefferie;Ven. dîner;Sam. déj.',
  'Alice;Dîner;Jamais;Miam;Miam',
  'Bob;Indifférent;Toujours;Miam;Miam',
  'Carla;Indifférent;Indifférent;Miam;Miam',
  'David;Indifférent;Indifférent;Miam;Miam',
  ';;;Alice;Bob',
  ';;;;Alice',
].join('\n');

describe('genetic immutable placements', () => {
  it('keeps the immutable chef/tâcheron in every initGenome() output', () => {
    const parsed = parseTable(CSV);
    const model = buildModel(parsed, algo(0.5));
    for (let i = 0; i < 20; i++) {
      const genome = initGenome(model, parsed);
      // Ven. dîner (meal 0): Alice is chef
      expect(genome[0].cooks).toContain(0);
      expect(genome[0].chef).toBe(0);
      // Sam. déj. (meal 1): Bob is chef, Alice is a forced tâcheron
      expect(genome[1].cooks).toContain(1);
      expect(genome[1].cooks).toContain(0);
      expect(genome[1].chef).toBe(1);
    }
  });

  it('preserves immutable placements throughout the GA run', () => {
    const parsed = parseTable(CSV);
    const { genome } = runGA(
      parsed,
      algo(0.5),
      DEFAULT_WEIGHTS,
      { ...DEFAULT_GA_SETTINGS, popSize: 20, generations: 15 },
      [],
    );
    expect(genome[0].cooks).toContain(0);
    expect(genome[0].chef).toBe(0);
    expect(genome[1].cooks).toContain(1);
    expect(genome[1].cooks).toContain(0);
    expect(genome[1].chef).toBe(1);
  });

  it('keeps only declared past tasks before the first optimizable meal', () => {
    const parsed = parseTable(CSV);

    const { genome, detail } = runGA(
      parsed,
      algo(0.5),
      DEFAULT_WEIGHTS,
      { ...DEFAULT_GA_SETTINGS, firstOptimizableMeal: 2, popSize: 20, generations: 5 },
      [],
    );

    expect(genome[0]).toEqual({ cooks: [0], chef: 0 });
    expect(detail.cookCount[0]).toBeGreaterThanOrEqual(1);
    expect(detail.chefCount[0]).toBeGreaterThanOrEqual(1);
  });

  it('uses the immutable task count as target for exempted participants', () => {
    const csv = [
      'Nom;Horaire;Chefferie;Exempté;Ven. dîner;Sam. déj.;Dim. déj.',
      'Alice;Dîner;Jamais;FALSE;Miam;Miam;Miam',
      'Bob;Indifférent;Toujours;TRUE;Miam;Miam;Miam',
      ';;;;;;Bob',
    ].join('\n');

    const parsed = parseTable(csv);
    const model = buildModel(parsed, algo(0.7));

    expect(parsed.participants[1].immutable).toHaveLength(1);
    expect(model.targets[1]).toBe(1);
  });

  it('reports progress during the GA run', () => {
    const parsed = parseTable(CSV);
    const calls: number[] = [];

    runGA(
      parsed,
      algo(0.5),
      DEFAULT_WEIGHTS,
      { ...DEFAULT_GA_SETTINGS, popSize: 20, generations: 10 },
      [],
      (current, total) => {
        calls.push(Math.round((current / total) * 100));
      },
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toBeGreaterThan(0);
    expect(calls.at(-1)).toBe(100);
  });

  it('penalizes imbalanced chef rates between participants who want to always chef', () => {
    const parsed: ParsedTable = {
      delim: ';',
      meals: [
        { label: 'R1', type: 'dej', col: 0, day: 0 },
        { label: 'R2', type: 'dej', col: 1, day: 0 },
        { label: 'R3', type: 'diner', col: 2, day: 1 },
        { label: 'R4', type: 'diner', col: 3, day: 1 },
      ],
      participants: [
        {
          name: 'Alice',
          horaire: 'indiff',
          chef: 'toujours',
          exempt: false,
          attends: [true, true, true, true],
          mealIdx: [0, 1, 2, 3],
          miamCount: 4,
          firstIdx: 0,
          lastIdx: 3,
          immutable: [],
        },
        {
          name: 'Bob',
          horaire: 'indiff',
          chef: 'toujours',
          exempt: false,
          attends: [true, true, true, true],
          mealIdx: [0, 1, 2, 3],
          miamCount: 4,
          firstIdx: 0,
          lastIdx: 3,
          immutable: [],
        },
        {
          name: 'Carla',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true, true, true],
          mealIdx: [0, 1, 2, 3],
          miamCount: 4,
          firstIdx: 0,
          lastIdx: 3,
          immutable: [],
        },
      ],
      immutables: [],
    };

    const model = buildModel(parsed, algo(0.5));
    const weights = {
      ...DEFAULT_WEIGHTS,
      targetPerson: 0,
      sameDay: 0,
      firstLast: 0,
      horaire: 0,
      chefJamais: 0,
      chefUnefois: 0,
      novelty: 0,
      spreadTasks: 0,
      chefToujours: 1,
    };

    const imbalanced = [
      { cooks: [0, 1], chef: 0 },
      { cooks: [0, 1], chef: 0 },
      { cooks: [0, 2], chef: 2 },
      { cooks: [0, 2], chef: 2 },
    ];
    const balanced = [
      { cooks: [0, 1], chef: 0 },
      { cooks: [0, 1], chef: 1 },
      { cooks: [0, 2], chef: 2 },
      { cooks: [0, 2], chef: 2 },
    ];

    const r1 = evaluate(imbalanced, model, parsed, weights, null, true);
    const r2 = evaluate(balanced, model, parsed, weights, null, true);

    expect(r1.chefCount.slice(0, 2)).toEqual([2, 0]);
    expect(r1.cookCount.slice(0, 2)).toEqual([4, 2]);
    expect(r2.chefCount.slice(0, 2)).toEqual([1, 1]);
    expect(r2.cookCount.slice(0, 2)).toEqual([4, 2]);
    expect(r1.score).toBeGreaterThan(r2.score);
    expect(
      r1.violations.some((v) => v.type === 'chef' && v.text.includes('anormalement moins chef')),
    ).toBe(true);
  });

  it('penalizes the same task-count deviation more for lower attendance participants', () => {
    const parsed: ParsedTable = {
      delim: ';',
      meals: Array.from({ length: 8 }, (_, i) => ({
        label: `R${i + 1}`,
        type: i % 2 === 0 ? 'dej' : 'diner',
        col: i,
        day: i,
      })),
      participants: [
        {
          name: 'Alice',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true, false, false, false, false, false, false],
          mealIdx: [0, 1],
          miamCount: 2,
          firstIdx: 0,
          lastIdx: 1,
          immutable: [],
        },
        {
          name: 'Bob',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true, true, true, true, true, true, true],
          mealIdx: [0, 1, 2, 3, 4, 5, 6, 7],
          miamCount: 8,
          firstIdx: 0,
          lastIdx: 7,
          immutable: [],
        },
      ],
      immutables: [],
    };

    const model = buildModel(parsed, algo(0.5));
    const weights = {
      ...DEFAULT_WEIGHTS,
      targetPerson: 1,
      sameDay: 0,
      firstLast: 0,
      horaire: 0,
      chefJamais: 0,
      chefUnefois: 0,
      chefToujours: 0,
      novelty: 0,
      spreadTasks: 0,
    };

    const lowAttendanceOverTarget = [
      { cooks: [0], chef: 0 },
      { cooks: [0], chef: 0 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [], chef: -1 },
      { cooks: [], chef: -1 },
    ];
    const highAttendanceOverTarget = [
      { cooks: [0], chef: 0 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [1], chef: 1 },
      { cooks: [], chef: -1 },
      { cooks: [], chef: -1 },
    ];

    const lowScore = evaluate(lowAttendanceOverTarget, model, parsed, weights, null, false).score;
    const highScore = evaluate(highAttendanceOverTarget, model, parsed, weights, null, false).score;

    expect(lowScore).toBeGreaterThan(highScore);
  });
});
