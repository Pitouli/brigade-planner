export type MealType = 'dej' | 'diner';
export type HorairePref = 'dej' | 'diner' | 'indiff';
export type ChefPref = 'jamais' | 'unefois' | 'toujours' | 'indiff';
export type ViolationType = 'horaire' | 'firstlast' | 'sameday' | 'target' | 'chef';
export type ImmutableRole = 'chef' | 'tacheron';

export interface Meal {
  label: string;
  type: MealType;
  col: number;
  day: number;
}

export interface ImmutableRoleEntry {
  mealIdx: number;
  role: ImmutableRole;
}

export interface Participant {
  name: string;
  horaire: HorairePref;
  chef: ChefPref;
  exempt: boolean;
  attends: boolean[];
  mealIdx: number[];
  miamCount: number;
  firstIdx: number;
  lastIdx: number;
  immutable: ImmutableRoleEntry[];
}

/** A chef/tâcheron assignment detected from the "tâcheronnage" sub-table pasted below the MIAM table. */
export interface ImmutableAssignment {
  mealIdx: number;
  name: string;
  participantIdx: number;
  role: ImmutableRole;
}

export interface ParsedTable {
  meals: Meal[];
  participants: Participant[];
  delim: string;
  immutables: ImmutableAssignment[];
}

export interface Model {
  mealAttendees: number[][];
  eligibleAttendees: number[][];
  brigadeSize: number[];
  targets: number[];
  /** Chef forced by the tâcheronnage sub-table, per meal (null if free). */
  immutableChef: (number | null)[];
  /** Cooks (chef included) forced by the tâcheronnage sub-table, per meal. */
  immutableCooks: number[][];
}

export interface Brigade {
  cooks: number[];
  chef: number;
}

export type Genome = Brigade[];

export interface Weights {
  targetPerson: number;
  sameDay: number;
  firstLast: number;
  horaire: number;
  chefJamais: number;
  chefUnefois: number;
  chefToujours: number;
  novelty: number;
}

export interface GaSettings {
  popSize: number;
  generations: number;
  mutRate: number;
  tournament: number;
  elite: number;
  /** One-based meal number from which the optimizer may change assignments. */
  firstOptimizableMeal: number;
}

export interface Violation {
  type: ViolationType;
  text: string;
}

export interface EvaluationResult {
  score: number;
  violations: Violation[];
  cookCount: number[];
  chefCount: number[];
}

export interface OptimizationRun {
  id: number;
  genome: Genome;
  detail: EvaluationResult;
  ratio: number;
  ms: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  targetPerson: 10,
  sameDay: 80,
  firstLast: 20,
  horaire: 15,
  chefJamais: 30,
  chefUnefois: 20,
  chefToujours: 10,
  novelty: 6,
};

export const DEFAULT_GA_SETTINGS: GaSettings = {
  popSize: 140,
  generations: 350,
  mutRate: 0.15,
  tournament: 3,
  elite: 2,
  firstOptimizableMeal: 1,
};

export const CHEF_LABEL: Record<ChefPref, string> = {
  jamais: 'Jamais',
  unefois: 'Une fois',
  toujours: 'Toujours',
  indiff: 'Indifférent',
};

export const HORAIRE_LABEL: Record<HorairePref, string> = {
  dej: 'Midi',
  diner: 'Soir',
  indiff: 'Indiff.',
};
