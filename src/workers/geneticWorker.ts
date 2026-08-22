import { runGA } from '../engine/genetic';
import type {
  BrigadeAlgoSettings,
  GaSettings,
  Genome,
  ParsedTable,
  Weights,
} from '../engine/types';

interface WorkerRequest {
  type: 'run';
  payload: {
    parsed: ParsedTable;
    algoSettings: BrigadeAlgoSettings;
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
    detail: ReturnType<typeof runGA>['detail'];
    algoSettings: BrigadeAlgoSettings;
    ms: number;
  };
}

interface WorkerErrorMessage {
  type: 'error';
  payload: {
    message: string;
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;
  if (type !== 'run') return;

  try {
    const t0 = performance.now();
    const { genome, detail } = runGA(
      payload.parsed,
      payload.algoSettings,
      payload.weights,
      payload.gaSettings,
      payload.previousGenomes,
      (current, total) => {
        const response: WorkerProgressMessage = {
          type: 'progress',
          payload: {
            current,
            total,
            progress: total === 0 ? 0 : (current / total) * 100,
          },
        };
        self.postMessage(response);
      },
    );
    const ms = Math.round(performance.now() - t0);

    const response: WorkerSuccessMessage = {
      type: 'done',
      payload: { genome, detail, algoSettings: payload.algoSettings, ms },
    };
    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: WorkerErrorMessage = {
      type: 'error',
      payload: { message },
    };
    self.postMessage(response);
  }
};
