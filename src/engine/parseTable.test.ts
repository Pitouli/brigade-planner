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

  it('ignores unrelated columns and keeps only Nom, Horaire, Chefferie, Exempté and meal columns', () => {
    const csv = [
      'Nom;Téléphone;;Départ de;Horaire;Chefferie;Exempté;;Ven. dîner;Sam. déj.',
      'Alice;0600000000;;Paris;Dîner;Jamais;FALSE;;Miam;Miam',
      'Bob;;;Paris;;Toujours;TRUE;;Miam;',
    ].join('\n');
    const parsed = parseTable(csv);
    expect(parsed.meals.map((m) => m.label)).toEqual(['Ven. dîner', 'Sam. déj.']);
    expect(parsed.participants).toHaveLength(2);
    expect(parsed.participants[0]).toMatchObject({ name: 'Alice', chef: 'jamais', exempt: false });
    expect(parsed.participants[1]).toMatchObject({ name: 'Bob', chef: 'toujours', exempt: true });
  });

  it('skips junk summary rows between the MIAM table and the tâcheronnage table', () => {
    const csv = [
      'Nom;Horaire;Chefferie;Ven. dîner;Sam. déj.',
      'Alice;Dîner;Jamais;Miam;Miam',
      'Nb personnes;;;0;0',
      '27;;;;',
      ';;;;',
    ].join('\n');
    const parsed = parseTable(csv);
    expect(parsed.participants).toHaveLength(1);
    expect(parsed.participants[0].name).toBe('Alice');
  });

  it('detects the tâcheronnage sub-table as immutable chef/tâcheron assignments', () => {
    const csv = [
      'Nom;Horaire;Chefferie;Ven. dîner;Sam. déj.',
      'Alice;Dîner;Jamais;Miam;Miam',
      'Bob;Indifférent;Toujours;Miam;Miam',
      ';;;Alice;Bob',
      ';;;;Alice',
    ].join('\n');
    const parsed = parseTable(csv);
    expect(parsed.immutables).toEqual([
      { mealIdx: 0, name: 'Alice', participantIdx: 0, role: 'chef' },
      { mealIdx: 1, name: 'Bob', participantIdx: 1, role: 'chef' },
      { mealIdx: 1, name: 'Alice', participantIdx: 0, role: 'tacheron' },
    ]);
    expect(parsed.participants[0].immutable).toEqual([
      { mealIdx: 0, role: 'chef' },
      { mealIdx: 1, role: 'tacheron' },
    ]);
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
