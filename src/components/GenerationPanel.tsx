import { Accordion, Button, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { ConstraintsForm } from './ConstraintsForm';
import type { GaSettings, Meal, Weights } from '../engine/types';

interface GenerationPanelProps {
  meals: Meal[];
  disabled: boolean;
  isRunning: boolean;
  lastRunMs: number | null;
  progress: number;
  progressCurrent: number;
  progressTotal: number;
  runCount: number;
  ratio: number;
  onRatioChange: (value: number) => void;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  gaSettings: GaSettings;
  onGaSettingsChange: (settings: GaSettings) => void;
  onGenerate: () => void;
  onClearHistory: () => void;
}

export function GenerationPanel({
  meals,
  disabled,
  isRunning,
  lastRunMs,
  progress,
  progressCurrent,
  progressTotal,
  runCount,
  ratio,
  onRatioChange,
  weights,
  onWeightsChange,
  gaSettings,
  onGaSettingsChange,
  onGenerate,
  onClearHistory,
}: GenerationPanelProps) {
  return (
    <Stack gap="sm">
      <Title order={2} size="h4">
        Génération
      </Title>

      <Accordion variant="separated">
        <Accordion.Item value="advanced">
          <Accordion.Control>
            <Text size="sm" fw={500}>
              Réglages avancés
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <ConstraintsForm
              meals={meals}
              ratio={ratio}
              onRatioChange={onRatioChange}
              weights={weights}
              onWeightsChange={onWeightsChange}
              gaSettings={gaSettings}
              onGaSettingsChange={onGaSettingsChange}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group>
        <Button onClick={onGenerate} loading={isRunning} disabled={disabled}>
          🎲 Générer une répartition
        </Button>
        <Button variant="default" onClick={onClearHistory} disabled={runCount === 0}>
          Effacer l'historique
        </Button>
        {lastRunMs !== null && (
          <Text size="sm" c="dimmed">
            Dernière génération produite en {lastRunMs} ms.
          </Text>
        )}
      </Group>

      {isRunning && (
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" fw={500}>
              Progression
              {progressTotal > 0 ? ` (${progressCurrent}/${progressTotal} générations)` : ''}
            </Text>
            <Text size="xs" c="dimmed">
              {Math.round(progress)}%
            </Text>
          </Group>
          <Progress value={progress} size="sm" radius="xl" />
        </Stack>
      )}

      <Text size="xs" c="dimmed">
        Astuce : relance plusieurs fois pour obtenir des alternatives. Toutes sont conservées
        ci-dessous, de la plus récente à la plus ancienne.
      </Text>
    </Stack>
  );
}
