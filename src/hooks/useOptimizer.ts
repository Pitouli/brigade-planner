import { useCallback, useState } from 'react';
import { runGA } from '../engine/genetic';
import { parseTable } from '../engine/parseTable';
import type { GaSettings, OptimizationRun, ParsedTable, Weights } from '../engine/types';

interface UseOptimizerResult {
  parsed: ParsedTable | null;
  parseError: string | null;
  history: OptimizationRun[];
  isRunning: boolean;
  lastRunMs: number | null;
  parse: (csv: string) => ParsedTable | null;
  generate: (ratio: number, weights: Weights, gaSettings: GaSettings) => void;
  removeRun: (id: number) => void;
  clearHistory: () => void;
}

/** Orchestrates table parsing and genetic-algorithm runs, keeping a history of generated brigades. */
export function useOptimizer(): UseOptimizerResult {
  const [parsed, setParsed] = useState<ParsedTable | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [history, setHistory] = useState<OptimizationRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunMs, setLastRunMs] = useState<number | null>(null);
  const [runCounter, setRunCounter] = useState(0);

  const parse = useCallback((csv: string) => {
    try {
      const result = parseTable(csv);
      setParsed(result);
      setParseError(null);
      return result;
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const generate = useCallback(
    (ratio: number, weights: Weights, gaSettings: GaSettings) => {
      if (!parsed) return;
      setIsRunning(true);
      // yield to the browser so the "running" state paints before the GA blocks the main thread
      setTimeout(() => {
        const previousGenomes = history.map((h) => h.genome);
        const t0 = performance.now();
        const { genome, detail } = runGA(parsed, ratio, weights, gaSettings, previousGenomes);
        const ms = Math.round(performance.now() - t0);
        const nextId = runCounter + 1;
        setRunCounter(nextId);
        setHistory((prev) => [{ id: nextId, genome, detail, ratio, ms }, ...prev]);
        setLastRunMs(ms);
        setIsRunning(false);
      }, 30);
    },
    [parsed, history, runCounter],
  );

  const removeRun = useCallback((id: number) => {
    setHistory((prev) => prev.filter((run) => run.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRunCounter(0);
  }, []);

  return {
    parsed,
    parseError,
    history,
    isRunning,
    lastRunMs,
    parse,
    generate,
    removeRun,
    clearHistory,
  };
}
