import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

class FastOcrManager {
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;
  private isTerminated = false;

  private async getWorker(): Promise<Worker> {
    if (this.worker && !this.isTerminated) {
      return this.worker;
    }

    if (this.workerPromise) {
      return this.workerPromise;
    }

    this.workerPromise = (async () => {
      try {
        const w = await createWorker(['tha', 'eng']);
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
    this.worker = null;
    this.workerPromise = null;

    if (currentWorker) {
      try {
        await currentWorker.terminate();
      } catch (err) {
        console.warn('[FastOcrManager] Error terminating worker:', err);
      }
    }
  }

  public async recognizeBuffer(buffer: Buffer, timeoutMs = 25000): Promise<{ success: boolean; text: string }> {
    try {
      const recognitionPromise = (async () => {
        // 1. Adaptive image preprocessing with Sharp for receipts and tax invoices
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

        // 2. Perform OCR recognition
        const worker = await this.getWorker();
        const ret = await worker.recognize(preprocessedBuffer);
        return {
          success: true,
          text: ret.data?.text || '',
        };
      })();

      const timeoutPromise = new Promise<{ success: boolean; text: string }>((resolve) => {
        setTimeout(() => {
          console.warn(`[FastOcrManager] OCR timed out after ${timeoutMs}ms`);
          resolve({ success: false, text: '' });
        }, timeoutMs);
      });

      return await Promise.race([recognitionPromise, timeoutPromise]);
    } catch (err) {
      console.warn('[FastOcrManager] Error during recognizeBuffer:', err);
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
