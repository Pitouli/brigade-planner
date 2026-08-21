import { Badge, Button, Divider, Grid, Group, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';
import {
  CHEF_LABEL,
  HORAIRE_LABEL,
  type OptimizationRun,
  type ParsedTable,
  type Violation,
} from '../engine/types';
import { downloadRunCsv, runToText } from '../utils/export';

interface ResultCardProps {
  run: OptimizationRun;
  parsed: ParsedTable;
  onRemove: (id: number) => void;
}

const VIOLATION_GROUPS: { key: Violation['type']; title: string; color: string }[] = [
  { key: 'sameday', title: '2× le même jour', color: 'red' },
  { key: 'firstlast', title: '1er / dernier repas', color: 'yellow' },
  { key: 'horaire', title: 'préférence midi/soir', color: 'cyan' },
  { key: 'chef', title: 'chefferie', color: 'violet' },
  { key: 'target', title: 'écart à la cible', color: 'gray' },
];

export function ResultCard({ run, parsed, onRemove }: ResultCardProps) {
  const P = parsed.participants;

  const groups = useMemo(() => {
    const byType: Record<Violation['type'], string[]> = {
      firstlast: [],
      sameday: [],
      horaire: [],
      target: [],
      chef: [],
    };
    for (const v of run.detail.violations) byType[v.type].push(v.text);
    return byType;
  }, [run.detail.violations]);

  const handleCopy = () => {
    navigator.clipboard.writeText(runToText(run, parsed));
    notifications.show({ message: 'Répartition copiée dans le presse-papier', color: 'teal' });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={3} size="h5">
            #{run.id} Répartition
          </Title>
          <Text size="sm" c="dimmed">
            Score de pénalité :{' '}
            <Text span fw={700} c="var(--mantine-color-text)">
              {run.detail.score.toFixed(1)}
            </Text>{' '}
            · ratio {run.ratio} · {run.ms} ms
          </Text>
        </div>
        <Group gap="xs">
          <Badge color="yellow" variant="light">
            {groups.firstlast.length} 1er/dernier
          </Badge>
          <Badge color="red" variant="light">
            {groups.sameday.length} 2×/jour
          </Badge>
          <Badge color="cyan" variant="light">
            {groups.horaire.length} horaire
          </Badge>
          <Badge color="violet" variant="light">
            {groups.chef.length} chefferie
          </Badge>
        </Group>
      </Group>

      <Group gap="xs">
        <Button size="xs" variant="default" onClick={handleCopy}>
          📋 Copier (texte)
        </Button>
        <Button size="xs" variant="default" onClick={() => downloadRunCsv(run, parsed)}>
          ⬇️ Export CSV brigades
        </Button>
        <Button size="xs" variant="default" color="red" onClick={() => onRemove(run.id)}>
          🗑 Retirer
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Title order={4} size="xs" tt="uppercase" c="dimmed" mb="xs">
            Brigades par repas
          </Title>
          <Table.ScrollContainer minWidth={400}>
            <Table striped highlightOnHover verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Repas</Table.Th>
                  <Table.Th>Chef ♛</Table.Th>
                  <Table.Th>Tâcherons</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {run.genome.map((brigade, mi) => {
                  if (!brigade.cooks.length) return null;
                  const meal = parsed.meals[mi];
                  const chefName = brigade.chef >= 0 ? P[brigade.chef].name : '—';
                  const others = brigade.cooks
                    .filter((i) => i !== brigade.chef)
                    .map((i) => P[i].name);
                  return (
                    <Table.Tr key={`${meal.label}-${meal.day}-${meal.type}`}>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="filled"
                          color={meal.type === 'dej' ? 'cyan' : 'violet'}
                        >
                          {meal.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text span fw={700} c="orange" style={{ whiteSpace: 'nowrap' }}>
                          {chefName} {chefName !== '—' && '♛'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {others.length ? (
                          <Group gap={4}>
                            {others.map((name) => (
                              <Badge key={name} size="xs" variant="light" color="gray">
                                {name}
                              </Badge>
                            ))}
                          </Group>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Title order={4} size="xs" tt="uppercase" c="dimmed" mb="xs">
            Bilan par personne
          </Title>
          <Table.ScrollContainer minWidth={320}>
            <Table striped highlightOnHover verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Corvées</Table.Th>
                  <Table.Th>Chef</Table.Th>
                  <Table.Th>Pref.</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {P.map((p, pi) => {
                  const target = run.ratio * p.miamCount;
                  const cookCount = run.detail.cookCount[pi];
                  const off = Math.abs(cookCount - target) >= 1;
                  const chefCount = run.detail.chefCount[pi];
                  return (
                    <Table.Tr key={p.name}>
                      <Table.Td>{p.name}</Table.Td>
                      <Table.Td c={off ? 'yellow' : undefined}>
                        {cookCount}{' '}
                        <Text span c="dimmed">
                          / ~{target.toFixed(1)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {chefCount > 0 ? (
                          <Text span c="orange" fw={700}>
                            {chefCount}
                          </Text>
                        ) : (
                          <Text span c="dimmed">
                            0
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {HORAIRE_LABEL[p.horaire]} · {CHEF_LABEL[p.chef]}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Grid.Col>
      </Grid>

      <Divider />

      {run.detail.violations.length === 0 ? (
        <Text c="teal">🎉 Aucune contrainte dé-respectée sur cette répartition.</Text>
      ) : (
        <Stack gap="sm">
          <Title order={4} size="xs" tt="uppercase" c="dimmed">
            Contraintes dé-respectées ({run.detail.violations.length})
          </Title>
          {VIOLATION_GROUPS.filter((g) => groups[g.key].length).map((g) => (
            <Stack key={g.key} gap={4}>
              <Text size="sm" fw={700} c={g.color}>
                {g.title} — {groups[g.key].length}
              </Text>
              <Grid>
                {groups[g.key].map((text) => (
                  <Grid.Col span={{ base: 12, sm: 6 }} key={text}>
                    <Text size="xs" c={g.color}>
                      {text}
                    </Text>
                  </Grid.Col>
                ))}
              </Grid>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
