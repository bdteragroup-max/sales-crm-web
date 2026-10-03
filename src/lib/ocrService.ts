import { fork, ChildProcess } from 'child_process';
import path from 'path';

interface OcrTask {
  id: string;
  resolve: (value: { success: boolean; text: string; error?: string }) => void;
  timer: NodeJS.Timeout;
}

class FastOcrManager {
  private child: ChildProcess | null = null;
  private pendingTasks = new Map<string, OcrTask>();
  private taskIdCounter = 0;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;

  private async ensureWorker(): Promise<void> {
    if (this.child && this.child.connected) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = new Promise((resolve) => {
      this.isStarting = true;
      const workerScript = path.resolve(process.cwd(), 'src/lib/ocrWorkerProcess.mjs');
      
      try {
        this.child = fork(workerScript, [], {
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
        });

        this.child.stdout?.on('data', (d) => {
          console.debug('[OCR Worker stdout]:', d.toString().trim());
        });

        this.child.stderr?.on('data', (d) => {
          console.warn('[OCR Worker stderr]:', d.toString().trim());
        });

        this.child.on('message', (msg: any) => {
          if (msg?.type === 'READY') {
            this.isStarting = false;
            resolve();
            return;
          }

          if (msg?.id && this.pendingTasks.has(msg.id)) {
            const task = this.pendingTasks.get(msg.id)!;
            clearTimeout(task.timer);
            this.pendingTasks.delete(msg.id);
            task.resolve({
              success: !!msg.success,
              text: msg.text || '',
              error: msg.error,
            });
          }
        });

        this.child.on('exit', (code, signal) => {
          console.warn(`[OCR Worker] exited with code ${code}, signal ${signal}`);
          this.child = null;
          this.isStarting = false;
          // Reject any pending tasks
          for (const [id, task] of this.pendingTasks.entries()) {
            clearTimeout(task.timer);
            task.resolve({ success: false, text: '', error: 'Worker process terminated' });
          }
          this.pendingTasks.clear();
        });

        // Fallback resolve after 8 seconds in case ready message was missed
        setTimeout(() => {
          this.isStarting = false;
          resolve();
        }, 8000);
      } catch (err) {
        console.error('[OCR Worker] Failed to fork worker process:', err);
        this.isStarting = false;
        this.child = null;
        resolve();
      }
    });

    return this.startPromise;
  }

  public restart(): void {
    if (this.child) {
      try {
        this.child.kill();
      } catch {}
      this.child = null;
    }
    this.startPromise = null;
    this.isStarting = false;
  }

  public async recognizeBuffer(buffer: Buffer, timeoutMs = 25000): Promise<{ success: boolean; text: string }> {
    try {
      await this.ensureWorker();
      if (!this.child || !this.child.connected) {
        return { success: false, text: '' };
      }

      const id = `ocr_${Date.now()}_${++this.taskIdCounter}`;

      return await new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (this.pendingTasks.has(id)) {
            this.pendingTasks.delete(id);
            console.warn(`[OCR Worker] Task ${id} timed out after ${timeoutMs}ms`);
            resolve({ success: false, text: '' });
          }
        }, timeoutMs);

        this.pendingTasks.set(id, { id, resolve, timer });

        this.child!.send({
          id,
          bufferBase64: buffer.toString('base64'),
        });
      });
    } catch (err) {
      console.warn('[FastOcrManager] Error during recognizeBuffer:', err);
      return { success: false, text: '' };
    }
  }
}

// Global instance
const globalForOcr = globalThis as unknown as { fastOcrManager?: FastOcrManager };
if (globalForOcr.fastOcrManager && typeof globalForOcr.fastOcrManager.restart === 'function') {
  try { globalForOcr.fastOcrManager.restart(); } catch {}
}
export const fastOcrManager = new FastOcrManager();
globalForOcr.fastOcrManager = fastOcrManager;
