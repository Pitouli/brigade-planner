import { describe, expect, it } from 'vitest';
import { EXAMPLE_CSV } from '../data/exampleCsv';
import { buildModel } from './model';
import { parseTable } from './parseTable';

describe('parseTable', () => {
  it('parses participants, meals and attendance', () => {
    const parsed = parseTable(EXAMPLE_CSV);
    expect(parsed.participants.length).toBeGreaterThan(0);
    expect(parsed.meals.length).toBeGreaterThan(0);
    expect(parsed.participants[0].name).toBe('JB');
  });

  it('assigns increasing day numbers starting from breakfast meals', () => {
    const parsed = parseTable(EXAMPLE_CSV);
    const days = parsed.meals.map((m) => m.day);
    expect(Math.min(...days)).toBe(0);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('throws on a table without data rows', () => {
    expect(() => parseTable('Nom;Horaire;Chefferie')).toThrow();
  });
});

describe('buildModel', () => {
  it('computes brigade sizes proportional to attendance and ratio', () => {
    const parsed = parseTable(EXAMPLE_CSV);
    const model = buildModel(parsed, 0.4);
    model.brigadeSize.forEach((size, i) => {
      const attendeeCount = model.mealAttendees[i].length;
      if (attendeeCount === 0) {
        expect(size).toBe(0);
      } else {
        expect(size).toBeGreaterThanOrEqual(1);
        expect(size).toBeLessThanOrEqual(attendeeCount);
      }
    });
  });
});
