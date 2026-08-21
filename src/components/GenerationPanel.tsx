import { Button, Group, Stack, Text, Title } from '@mantine/core';

interface GenerationPanelProps {
  disabled: boolean;
  isRunning: boolean;
  lastRunMs: number | null;
  runCount: number;
  onGenerate: () => void;
  onClearHistory: () => void;
}

export function GenerationPanel({
  disabled,
  isRunning,
  lastRunMs,
  runCount,
  onGenerate,
  onClearHistory,
}: GenerationPanelProps) {
  return (
    <Stack gap="sm">
      <Title order={2} size="h4">
        3. Génération
      </Title>
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
      <Text size="xs" c="dimmed">
        Astuce : relance plusieurs fois pour obtenir des alternatives. Toutes sont conservées
        ci-dessous, de la plus récente à la plus ancienne.
      </Text>
    </Stack>
  );
}
