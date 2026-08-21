import { Badge, Button, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { useCallback } from 'react';
import { EXAMPLE_CSV } from '../data/exampleCsv';
import type { ParsedTable } from '../engine/types';
import { ParsedPreview } from './ParsedPreview';

interface DataInputProps {
  csv: string;
  onCsvChange: (csv: string) => void;
  parsed: ParsedTable | null;
  parseError: string | null;
  onParse: (csv: string) => void;
}

export function DataInput({ csv, onCsvChange, parsed, parseError, onParse }: DataInputProps) {
  const handleLoadExample = useCallback(() => {
    onCsvChange(EXAMPLE_CSV);
    onParse(EXAMPLE_CSV);
  }, [onCsvChange, onParse]);

  const nDej = parsed?.meals.filter((m) => m.type === 'dej').length ?? 0;
  const nDiner = parsed?.meals.filter((m) => m.type === 'diner').length ?? 0;

  return (
    <Stack gap="sm">
      <Title order={2} size="h4">
        Données des participants
      </Title>
      <Text size="sm" c="dimmed">
        Colle depuis un tableur, même en vrac : les colonnes inutiles sont ignorées, seules{' '}
        <strong>Nom, Horaire, Chefferie, Exempté</strong> et les colonnes finissant par
        «&nbsp;dîner&nbsp;» ou «&nbsp;déj.&nbsp;» sont conservées. Le tableau de tâcheronnage en
        dessous (chef de brigade + tâcherons) est détecté automatiquement.
      </Text>
      <Textarea
        value={csv}
        onChange={(e) => onCsvChange(e.currentTarget.value)}
        autosize
        minRows={7}
        maxRows={14}
        ff="monospace"
        styles={{ input: { fontSize: 12.5 } }}
      />
      <Group>
        <Button variant="default" size="xs" onClick={() => onParse(csv)}>
          Analyser le tableau
        </Button>
        <Button variant="default" size="xs" onClick={handleLoadExample}>
          Recharger l'exemple
        </Button>
        {parseError ? (
          <Badge color="red" variant="light">
            ✗ {parseError}
          </Badge>
        ) : parsed ? (
          <Badge color="teal" variant="light">
            ✓ {parsed.participants.length} participants · {parsed.meals.length} repas ({nDej} déj /{' '}
            {nDiner} dîners)
          </Badge>
        ) : (
          <Badge color="gray" variant="light">
            —
          </Badge>
        )}
      </Group>
      {parsed && <ParsedPreview parsed={parsed} />}
    </Stack>
  );
}
