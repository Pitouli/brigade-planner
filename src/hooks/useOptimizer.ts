import { useCallback, useEffect, useRef, useState } from 'react';
import { parseTable } from '../engine/parseTable';
import type { GaSettings, Genome, OptimizationRun, ParsedTable, Weights } from '../engine/types';

interface UseOptimizerResult {
  parsed: ParsedTable | null;
  parseError: string | null;
  history: OptimizationRun[];
  isRunning: boolean;
  lastRunMs: number | null;
  progress: number;
  progressCurrent: number;
  progressTotal: number;
  parse: (csv: string) => ParsedTable | null;
  generate: (ratio: number, weights: Weights, gaSettings: GaSettings) => void;
  removeRun: (id: number) => void;
  clearHistory: () => void;
}

interface WorkerRequest {
  type: 'run';
  payload: {
    parsed: ParsedTable;
    ratio: number;
    weights: Weights;
    gaSettings: GaSettings;
    previousGenomes: Genome[];
  };
}

interface WorkerProgressMessage {
  type: 'progress';
  payload: {
    current: number;
    total: number;
    progress: number;
  };
}

interface WorkerSuccessMessage {
  type: 'done';
  payload: {
    genome: Genome;
    detail: OptimizationRun['detail'];
    ratio: number;
    ms: number;
  };
}

interface WorkerErrorMessage {
  type: 'error';
  payload: {
    message: string;
  };
}

/** Orchestrates table parsing and genetic-algorithm runs, keeping a history of generated brigades. */
export function useOptimizer(): UseOptimizerResult {
  const [parsed, setParsed] = useState<ParsedTable | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [history, setHistory] = useState<OptimizationRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunMs, setLastRunMs] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/geneticWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (
      event: MessageEvent<WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage>,
    ) => {
      const { data } = event;
      if (data.type === 'progress') {
        setProgress(data.payload.progress);
        setProgressCurrent(data.payload.current);
        setProgressTotal(data.payload.total);
        return;
      }

      if (data.type === 'error') {
        setIsRunning(false);
        setParseError(data.payload.message);
        setProgress(0);
        setProgressCurrent(0);
        setProgressTotal(0);
        return;
      }

      const { genome, detail, ratio, ms } = data.payload;
      setHistory((current) => {
        const nextId = current.reduce((maxId, run) => Math.max(maxId, run.id), 0) + 1;
        return [{ id: nextId, genome, detail, ratio, ms }, ...current];
      });
      setLastRunMs(ms);
      setProgress(100);
      setIsRunning(false);
    };

    worker.onerror = () => {
      setIsRunning(false);
      setParseError('Le calcul génétique a échoué dans le worker.');
      setProgressCurrent(0);
      setProgressTotal(0);
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

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
      if (!parsed || !workerRef.current) return;
      if (isRunning) return;

      const previousGenomes = history.map((run) => run.genome);
      setProgress(0);
      setProgressCurrent(0);
      setProgressTotal(gaSettings.generations);
      setIsRunning(true);
      const request: WorkerRequest = {
        type: 'run',
        payload: { parsed, ratio, weights, gaSettings, previousGenomes },
      };
      workerRef.current.postMessage(request);
    },
    [history, isRunning, parsed],
  );

  const removeRun = useCallback((id: number) => {
    setHistory((prev) => prev.filter((run) => run.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setProgress(0);
  }, []);

  return {
    parsed,
    parseError,
    history,
    isRunning,
    lastRunMs,
    progress,
    parse,
    generate,
    removeRun,
    clearHistory,
    progressCurrent,
    progressTotal,
  };
}
