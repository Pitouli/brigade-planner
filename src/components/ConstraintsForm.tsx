import { Grid, NumberInput, Select, Stack, Title, Tooltip } from '@mantine/core';
import type { GaSettings, Meal, Weights } from '../engine/types';

interface ConstraintsFormProps {
  meals: Meal[];
  ratio: number;
  onRatioChange: (value: number) => void;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  gaSettings: GaSettings;
  onGaSettingsChange: (settings: GaSettings) => void;
}

export function ConstraintsForm({
  meals,
  ratio,
  onRatioChange,
  weights,
  onWeightsChange,
  gaSettings,
  onGaSettingsChange,
}: ConstraintsFormProps) {
  const setWeight = (key: keyof Weights) => (value: number | string) =>
    onWeightsChange({ ...weights, [key]: Number(value) });
  const setGa = (key: keyof GaSettings) => (value: number | string) =>
    onGaSettingsChange({ ...gaSettings, [key]: Number(value) });

  const tooltips = {
    ratio:
      'Nombre de corvées estimé à partir du ratio pour garder un équilibre proche du nombre de miams.',
    sameDay: 'Pénalité élevée pour éviter qu’une personne ait deux tâches le même jour.',
    firstLast: 'Réduit les répartitions trop lourdes au premier ou au dernier repas de la journée.',
    horaire:
      'Aide à mieux correspondre les rôles aux créneaux de repas selon les préférences de service.',
    chefJamais:
      'Pénalité appliquée quand une personne a indiqué qu’elle ne veut jamais prendre le rôle de chef.',
    chefUnefois:
      'Encourage une distribution plus équilibrée entre les personnes qui souhaitent être chef une seule fois.',
    chefToujours:
      'Pénalise les cas « toujours » non-chef et aide à équilibrer leur taux de chefferie entre eux, au prorata de leurs tâches.',
    targetPerson:
      'Aide à tendre la répartition vers l’objectif cible tout en respectant les préférences individuelles.',
    popSize: 'Taille de la population générée à chaque étape de l’algorithme.',
    generations: 'Nombre d’itérations de recherche pour continuer à améliorer la solution.',
    mutRate:
      'Probabilité d’introduire une variation pour éviter le blocage sur une solution trop stable.',
    novelty: 'Valeur positive : le moteur favorise les solutions plus différentes des précédentes.',
    firstOptimizableMeal:
      'Les repas précédents restent identiques au dernier résultat généré, mais leurs tâches comptent dans l’équilibrage.',
  } as const;

  return (
    <Stack gap="md">
      <Title order={3} size="xs" tt="uppercase" c="dimmed" mb={-10}>
        Paramètres de répartition
      </Title>
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.ratio} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Tâcheronnages cible « par miam »"
                value={ratio}
                onChange={(v) => onRatioChange(Number(v))}
                step={0.05}
                min={0.05}
                max={1}
                decimalScale={2}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.sameDay} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Éviter 2 corvées le même jour"
                value={weights.sameDay}
                onChange={setWeight('sameDay')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.firstLast} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Éviter 1er / dernier repas"
                value={weights.firstLast}
                onChange={setWeight('firstLast')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.horaire} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Respect horaire (midi/soir)"
                value={weights.horaire}
                onChange={setWeight('horaire')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
      </Grid>

      <Title order={3} size="xs" tt="uppercase" c="dimmed" mt={10} mb={-10}>
        Poids des préférences de chefferie
      </Title>
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.chefJamais} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="« Jamais » forcé à cheffer"
                value={weights.chefJamais}
                onChange={setWeight('chefJamais')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.chefUnefois} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="« Une fois » (écart à 1)"
                value={weights.chefUnefois}
                onChange={setWeight('chefUnefois')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.chefToujours} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="« Toujours » non-chef"
                value={weights.chefToujours}
                onChange={setWeight('chefToujours')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.targetPerson} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Équilibrage cible/personne"
                value={weights.targetPerson}
                onChange={setWeight('targetPerson')}
                step={0.5}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
      </Grid>

      <Title order={3} size="xs" tt="uppercase" c="dimmed" mt={10} mb={-10}>
        Algorithme génétique
      </Title>
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.popSize} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Population"
                value={gaSettings.popSize}
                onChange={setGa('popSize')}
                step={10}
                min={20}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.generations} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Générations"
                value={gaSettings.generations}
                onChange={setGa('generations')}
                step={50}
                min={50}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.mutRate} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Taux de mutation"
                value={gaSettings.mutRate}
                onChange={setGa('mutRate')}
                step={0.05}
                min={0}
                max={1}
                decimalScale={2}
              />
            </div>
          </Tooltip>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.novelty} multiline w={260} withArrow>
            <div>
              <NumberInput
                label="Nouveauté vs alternatives"
                value={weights.novelty}
                onChange={setWeight('novelty')}
                step={0.1}
                min={0}
              />
            </div>
          </Tooltip>
        </Grid.Col>
      </Grid>

      <Title order={3} size="xs" tt="uppercase" c="dimmed" mt={10} mb={-10}>
        Divers
      </Title>
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Tooltip label={tooltips.firstOptimizableMeal} multiline w={260} withArrow>
            <div>
              <Select
                label="Optimiser à partir du repas"
                data={meals.map((meal, index) => ({
                  value: String(index + 1),
                  label: `${index + 1}. ${meal.label}`,
                }))}
                value={String(gaSettings.firstOptimizableMeal ?? 1)}
                onChange={(value) => {
                  if (value !== null) setGa('firstOptimizableMeal')(value);
                }}
                allowDeselect={false}
              />
            </div>
          </Tooltip>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
