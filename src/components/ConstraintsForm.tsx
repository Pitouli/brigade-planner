import { Accordion, Grid, NumberInput, Stack, Title } from '@mantine/core';
import type { GaSettings, Weights } from '../engine/types';

interface ConstraintsFormProps {
  ratio: number;
  onRatioChange: (value: number) => void;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  gaSettings: GaSettings;
  onGaSettingsChange: (settings: GaSettings) => void;
}

export function ConstraintsForm({
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

  return (
    <Stack gap="sm">
      <Title order={2} size="h4">
        2. Contraintes &amp; objectifs
      </Title>
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Tâcheronnages cible « par miam »"
            description="Nb de corvées ≈ ratio × nb de miams"
            value={ratio}
            onChange={(v) => onRatioChange(Number(v))}
            step={0.05}
            min={0.05}
            max={1}
            decimalScale={2}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Éviter 2 corvées le même jour"
            value={weights.sameDay}
            onChange={setWeight('sameDay')}
            step={0.5}
            min={0}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Éviter 1er / dernier repas"
            value={weights.firstLast}
            onChange={setWeight('firstLast')}
            step={0.5}
            min={0}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Respect horaire (midi/soir)"
            value={weights.horaire}
            onChange={setWeight('horaire')}
            step={0.5}
            min={0}
          />
        </Grid.Col>
      </Grid>

      <Accordion variant="separated">
        <Accordion.Item value="advanced">
          <Accordion.Control>
            ⚙️ Réglages avancés (poids des préférences &amp; algorithme génétique)
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Title order={3} size="xs" tt="uppercase" c="dimmed">
                Poids des préférences de chefferie
              </Title>
              <Grid>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="« Jamais » forcé à cheffer"
                    value={weights.chefJamais}
                    onChange={setWeight('chefJamais')}
                    step={0.5}
                    min={0}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="« Une fois » (écart à 1)"
                    value={weights.chefUnefois}
                    onChange={setWeight('chefUnefois')}
                    step={0.5}
                    min={0}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="« Toujours » non-chef"
                    value={weights.chefToujours}
                    onChange={setWeight('chefToujours')}
                    step={0.5}
                    min={0}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Équilibrage cible/personne"
                    value={weights.targetPerson}
                    onChange={setWeight('targetPerson')}
                    step={0.5}
                    min={0}
                  />
                </Grid.Col>
              </Grid>

              <Title order={3} size="xs" tt="uppercase" c="dimmed">
                Algorithme génétique
              </Title>
              <Grid>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Population"
                    value={gaSettings.popSize}
                    onChange={setGa('popSize')}
                    step={10}
                    min={20}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Générations"
                    value={gaSettings.generations}
                    onChange={setGa('generations')}
                    step={50}
                    min={50}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Taux de mutation"
                    value={gaSettings.mutRate}
                    onChange={setGa('mutRate')}
                    step={0.05}
                    min={0}
                    max={1}
                    decimalScale={2}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Nouveauté vs alternatives"
                    description="> 0 : pousse les nouvelles générations à différer"
                    value={weights.novelty}
                    onChange={setWeight('novelty')}
                    step={0.1}
                    min={0}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
