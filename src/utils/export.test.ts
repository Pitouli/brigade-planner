import { describe, expect, it } from 'vitest';
import type { OptimizationRun, ParsedTable } from '../engine/types';
import { runToText } from './export';

describe('runToText', () => {
  it('returns a table formatted for Excel paste with chefs on the first row and names only', () => {
    const parsed: ParsedTable = {
      delim: ';',
      meals: [
        { label: 'Ven. dîner', type: 'diner', col: 0, day: 0 },
        { label: 'Sam. déj.', type: 'dej', col: 1, day: 1 },
      ],
      participants: [
        {
          name: 'Alice',
          horaire: 'diner',
          chef: 'jamais',
          exempt: false,
          attends: [true, true],
          mealIdx: [0, 1],
          miamCount: 2,
          firstIdx: 0,
          lastIdx: 1,
          immutable: [],
        },
        {
          name: 'Bob',
          horaire: 'dej',
          chef: 'unefois',
          exempt: false,
          attends: [true, true],
          mealIdx: [0, 1],
          miamCount: 2,
          firstIdx: 0,
          lastIdx: 1,
          immutable: [],
        },
        {
          name: 'Cécile',
          horaire: 'indiff',
          chef: 'toujours',
          exempt: false,
          attends: [true, true],
          mealIdx: [0, 1],
          miamCount: 2,
          firstIdx: 0,
          lastIdx: 1,
          immutable: [],
        },
        {
          name: 'Dylan',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true],
          mealIdx: [0, 1],
          miamCount: 2,
          firstIdx: 0,
          lastIdx: 1,
          immutable: [],
        },
      ],
      immutables: [],
    };

    const run: OptimizationRun = {
      id: 7,
      ratio: 1,
      ms: 12,
      genome: [
        { chef: 0, cooks: [0, 1, 2] },
        { chef: 2, cooks: [2, 3] },
      ],
      detail: {
        score: 0,
        violations: [],
        cookCount: [3, 2],
        chefCount: [1, 1],
      },
    };

    const result = runToText(run, parsed);
    const rows = result.split('\n').map((row) => row.split('\t'));

    expect(rows).toEqual([
      ['Alice', 'Cécile'],
      ['Bob', 'Dylan'],
      ['Cécile', ''],
    ]);
  });

  it('keeps empty meal columns so later meals remain aligned', () => {
    const parsed: ParsedTable = {
      delim: ';',
      meals: [
        { label: 'Ven. dîner', type: 'diner', col: 0, day: 0 },
        { label: 'Sam. déj.', type: 'dej', col: 1, day: 1 },
        { label: 'Sam. déj.', type: 'dej', col: 2, day: 8 },
      ],
      participants: [
        {
          name: 'Alice',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true, true],
          mealIdx: [0, 1, 2],
          miamCount: 3,
          firstIdx: 0,
          lastIdx: 2,
          immutable: [],
        },
        {
          name: 'Bob',
          horaire: 'indiff',
          chef: 'indiff',
          exempt: false,
          attends: [true, true, true],
          mealIdx: [0, 1, 2],
          miamCount: 3,
          firstIdx: 0,
          lastIdx: 2,
          immutable: [],
        },
      ],
      immutables: [],
    };
    const run: OptimizationRun = {
      id: 8,
      ratio: 1,
      ms: 12,
      genome: [
        { chef: -1, cooks: [] },
        { chef: 0, cooks: [0] },
        { chef: 1, cooks: [1] },
      ],
      detail: { score: 0, violations: [], cookCount: [1, 1], chefCount: [1, 1] },
    };

    expect(runToText(run, parsed)).toBe('\tAlice\tBob');
  });
});
