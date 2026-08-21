import { runGA } from '../engine/genetic';
import type { GaSettings, Genome, ParsedTable, Weights } from '../engine/types';

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
    progress: number;
  };
}

interface WorkerSuccessMessage {
  type: 'done';
  payload: {
    genome: Genome;
    detail: ReturnType<typeof runGA>['detail'];
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

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;
  if (type !== 'run') return;

  try {
    const t0 = performance.now();
    const { genome, detail } = runGA(
      payload.parsed,
      payload.ratio,
      payload.weights,
      payload.gaSettings,
      payload.previousGenomes,
      (current, total) => {
        const response: WorkerProgressMessage = {
          type: 'progress',
          payload: { progress: total === 0 ? 0 : (current / total) * 100 },
        };
        self.postMessage(response);
      },
    );
    const ms = Math.round(performance.now() - t0);

    const response: WorkerSuccessMessage = {
      type: 'done',
      payload: { genome, detail, ratio: payload.ratio, ms },
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
