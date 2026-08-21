import { Badge, Button, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { useCallback } from 'react';
import { EXAMPLE_CSV } from '../data/exampleCsv';
import type { ParsedTable } from '../engine/types';

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
        Colle depuis un tableur (séparateur Tab, ;, , ou | — auto-détecté). Colonnes attendues :{' '}
        <Text span fw={600}>
          Nom, Horaire, Chefferie
        </Text>{' '}
        puis un « Miam » par repas.
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
    </Stack>
  );
}
