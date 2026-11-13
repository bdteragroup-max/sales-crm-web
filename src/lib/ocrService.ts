import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorker, OEM, Worker } from 'tesseract.js';
import sharp from 'sharp';

class FastOcrManager {
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;
  private isTerminated = false;
  // Serialize worker.recognize() calls because a single Tesseract.js WASM worker cannot run concurrent jobs safely.
  private recognizeChain: Promise<unknown> = Promise.resolve();

  private resolveCachePath(): string {
    const cwd = process.cwd();
    const hasLocalTrainedData =
      fs.existsSync(path.join(cwd, 'eng.traineddata')) &&
      fs.existsSync(path.join(cwd, 'tha.traineddata'));
    return hasLocalTrainedData ? cwd : os.tmpdir();
  }

  private async getWorker(): Promise<Worker> {
    if (this.worker && !this.isTerminated) {
      return this.worker;
    }

    if (this.workerPromise) {
      return this.workerPromise;
    }

    this.workerPromise = (async () => {
      try {
        const cachePath = this.resolveCachePath();
        const w = await createWorker(['tha', 'eng'], OEM.LSTM_ONLY, { cachePath });
        this.worker = w;
        this.isTerminated = false;
        return w;
      } catch (err) {
        this.workerPromise = null;
        this.worker = null;
        throw err;
      }
    })();

    return this.workerPromise;
  }

  public async restart(): Promise<void> {
    this.isTerminated = true;
    const currentWorker = this.worker;
    const pendingInit = this.workerPromise;
    this.worker = null;
    this.workerPromise = null;

    const workerToTerminate = currentWorker || (pendingInit ? await pendingInit.catch(() => null) : null);
    if (workerToTerminate) {
      try {
        await workerToTerminate.terminate();
      } catch (err) {
        console.warn('[FastOcrManager] Error terminating worker:', err);
      }
    }
  }

  public async recognizeBuffer(buffer: Buffer, timeoutMs = 25000): Promise<{ success: boolean; text: string }> {
    try {
      // Preprocess image eagerly before entering the worker mutex so CPU pipelines don't block the queue wait.
      let pipeline = sharp(buffer).rotate();
      const meta = await pipeline.metadata();
      const wPx = meta.width || 800;
      const hPx = meta.height || 600;
      const maxDim = Math.max(wPx, hPx);

      // Ensure receipts have sufficient horizontal resolution (~1600px) so Thai characters and numbers are crisp
      if (wPx < 1400) {
        const scale = Math.min(2.5, 1600 / wPx);
        pipeline = pipeline.resize(Math.round(wPx * scale), Math.round(hPx * scale), { kernel: 'lanczos3' });
      } else if (maxDim > 3200) {
        pipeline = pipeline.resize(3200, 3200, { fit: 'inside', withoutEnlargement: true });
      }

      // Enhance contrast for receipt paper, colored bills, stamps
      pipeline = pipeline
        .greyscale()
        .linear(1.35, -25)
        .sharpen({ sigma: 1.0 });

      const preprocessedBuffer = await pipeline.png().toBuffer();

      const recognitionPromise = new Promise<{ success: boolean; text: string }>((resolve, reject) => {
        const job = this.recognizeChain.then(async () => {
          const worker = await this.getWorker();
          const ret = await worker.recognize(preprocessedBuffer);
          return {
            success: true,
            text: ret.data?.text || '',
          };
        });

        // Advance the chain regardless of job outcome so a single failure never stalls subsequent uploads.
        this.recognizeChain = job.catch(() => undefined);
        job.then(resolve, reject);
      });

      const timeoutPromise = new Promise<{ success: boolean; text: string }>((resolve) => {
        setTimeout(() => {
          console.warn(`[FastOcrManager] OCR timed out after ${timeoutMs}ms — resetting worker`);
          void this.restart();
          resolve({ success: false, text: '' });
        }, timeoutMs);
      });

      return await Promise.race([recognitionPromise, timeoutPromise]);
    } catch (err) {
      console.warn('[FastOcrManager] Error during recognizeBuffer:', err);
      await this.restart();
      return { success: false, text: '' };
    }
  }
}

// Global instance to reuse worker across API calls in the same serverless instance
const globalForOcr = globalThis as unknown as { fastOcrManager?: FastOcrManager };
export const fastOcrManager = globalForOcr.fastOcrManager || new FastOcrManager();
if (process.env.NODE_ENV !== 'production') {
  globalForOcr.fastOcrManager = fastOcrManager;
}
