import { Alert, Badge, Stack, Table, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { CHEF_LABEL, HORAIRE_LABEL, type ParsedTable } from '../engine/types';

interface ParsedPreviewProps {
  parsed: ParsedTable;
}

/** Shows the data detected by parseTable(): participants table + immutable tâcheronnage. */
export function ParsedPreview({ parsed }: ParsedPreviewProps) {
  const { meals, participants, immutables } = parsed;

  const immutableByCell = useMemo(() => {
    const map = new Map<string, 'chef' | 'tacheron'>();
    participants.forEach((p, pi) => {
      for (const entry of p.immutable) {
        map.set(`${pi}-${entry.mealIdx}`, entry.role);
      }
    });
    return map;
  }, [participants]);

  const unmatched = immutables.filter((a) => a.participantIdx === -1);

  return (
    <Stack gap="sm">
      <Title order={4} size="h5">
        Données détectées
      </Title>

      <Table.ScrollContainer minWidth="100%">
        <Table striped highlightOnHover verticalSpacing={4} fz="xs" style={{ tableLayout: 'auto' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  backgroundColor: 'var(--mantine-color-body)',
                }}
              >
                Nom
              </Table.Th>
              <Table.Th>Horaire</Table.Th>
              <Table.Th>Chefferie</Table.Th>
              {meals.map((meal) => (
                <Table.Th
                  key={`${meal.label}-${meal.day}-${meal.type}`}
                  ta="center"
                  style={{ whiteSpace: 'nowrap', minWidth: 70, paddingLeft: 0, paddingRight: 0 }}
                >
                  <Badge size="xs" variant="light" color={meal.type === 'dej' ? 'cyan' : 'violet'}>
                    {meal.label}
                  </Badge>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {participants.map((p, pi) => (
              <Table.Tr key={p.name}>
                <Table.Td
                  fw={600}
                  style={{
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: 'var(--mantine-color-body)',
                  }}
                >
                  {p.name}
                </Table.Td>
                <Table.Td>{p.exempt ? '❌' : HORAIRE_LABEL[p.horaire]}</Table.Td>
                <Table.Td>{p.exempt ? '❌' : CHEF_LABEL[p.chef]}</Table.Td>
                {meals.map((meal, mi) => {
                  const role = immutableByCell.get(`${pi}-${mi}`);
                  const attends = p.attends[mi];
                  return (
                    <Table.Td key={`${meal.label}-${meal.day}-${meal.type}`} ta="center">
                      {role === 'chef' ? (
                        <Text span c="orange" fw={700} title="Chef de brigade (immuable)">
                          ♛
                        </Text>
                      ) : role === 'tacheron' ? (
                        <Text span c="grape" fw={700} title="Tâcheron (immuable)">
                          🔧
                        </Text>
                      ) : attends ? (
                        <Text span c="teal">
                          ✓
                        </Text>
                      ) : (
                        <Text span c="dimmed">
                          ·
                        </Text>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {unmatched.length > 0 && (
        <Alert color="yellow" variant="light" title="Noms non reconnus dans le tâcheronnage">
          {unmatched.map((a) => `${a.name} (${meals[a.mealIdx]?.label})`).join(', ')}
        </Alert>
      )}
    </Stack>
  );
}
