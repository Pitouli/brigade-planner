import { describe, expect, it } from 'vitest';
import { initGenome, runGA } from './genetic';
import { buildModel } from './model';
import { parseTable } from './parseTable';
import { DEFAULT_GA_SETTINGS, DEFAULT_WEIGHTS } from './types';

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
    const model = buildModel(parsed, 0.5);
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
      0.5,
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
});
