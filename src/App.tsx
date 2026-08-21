import { Container, Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { DataInput } from './components/DataInput';
import { GenerationPanel } from './components/GenerationPanel';
import { ResultCard } from './components/ResultCard';
import { EXAMPLE_CSV } from './data/exampleCsv';
import {
  DEFAULT_GA_SETTINGS,
  DEFAULT_WEIGHTS,
  type GaSettings,
  type Weights,
} from './engine/types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOptimizer } from './hooks/useOptimizer';

function App() {
  const [csv, setCsv] = useLocalStorage('brigade-planner:csv', EXAMPLE_CSV);
  const [ratio, setRatio] = useLocalStorage('brigade-planner:ratio', 0.4);
  const [weights, setWeights] = useLocalStorage<Weights>(
    'brigade-planner:weights',
    DEFAULT_WEIGHTS,
  );
  const [gaSettings, setGaSettings] = useLocalStorage<GaSettings>(
    'brigade-planner:ga',
    DEFAULT_GA_SETTINGS,
  );

  const {
    parsed,
    parseError,
    history,
    isRunning,
    lastRunMs,
    parse,
    generate,
    removeRun,
    clearHistory,
  } = useOptimizer();

  const [hasParsedOnce, setHasParsedOnce] = useState(false);
  useEffect(() => {
    if (!hasParsedOnce) {
      parse(csv);
      setHasParsedOnce(true);
    }
  }, [csv, hasParsedOnce, parse]);

  const handleGenerate = () => {
    const current = parsed ?? parse(csv);
    if (!current) return;
    generate(ratio, weights, gaSettings);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xs" mb="lg">
        <Title order={1}>🍳 Brigades de repas — optimiseur génétique</Title>
        <Text c="dimmed" size="sm" maw={820}>
          Colle ton tableau (participants + « Miam »), règle les contraintes, et laisse l'algo
          génétique répartir les tâcherons et les chefs de brigade. Chaque génération est conservée
          : tu peux relancer des alternatives et comparer.
        </Text>
      </Stack>

      <Stack gap="md">
        <Paper withBorder radius="md" p="lg">
          <DataInput
            csv={csv}
            onCsvChange={setCsv}
            parsed={parsed}
            parseError={parseError}
            onParse={parse}
          />
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <GenerationPanel
            disabled={!parsed}
            isRunning={isRunning}
            lastRunMs={lastRunMs}
            runCount={history.length}
            ratio={ratio}
            onRatioChange={setRatio}
            weights={weights}
            onWeightsChange={setWeights}
            gaSettings={gaSettings}
            onGaSettingsChange={setGaSettings}
            onGenerate={handleGenerate}
            onClearHistory={clearHistory}
          />
        </Paper>

        {parsed &&
          history.map((run) => (
            <Paper withBorder radius="md" p="lg" key={run.id}>
              <ResultCard run={run} parsed={parsed} onRemove={removeRun} />
            </Paper>
          ))}
      </Stack>
    </Container>
  );
}

export default App;
