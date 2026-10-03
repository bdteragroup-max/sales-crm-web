import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

let worker = null;

async function init() {
  if (!worker) {
    worker = await createWorker(['tha', 'eng']);
  }
  return worker;
}

// Pre-warm worker on process launch
init().then(() => {
  if (process.send) {
    process.send({ type: 'READY' });
  }
}).catch((err) => {
  console.error('[OCR Worker] Init error:', err);
  if (process.send) {
    process.send({ type: 'READY_ERROR', error: String(err) });
  }
});

process.on('message', async (msg) => {
  const { id, imagePath, bufferBase64 } = msg;
  const start = Date.now();
  try {
    const w = await init();
    let imgBuffer;
    if (imagePath) {
      imgBuffer = fs.readFileSync(imagePath);
    } else if (bufferBase64) {
      imgBuffer = Buffer.from(bufferBase64, 'base64');
    } else {
      throw new Error('No image provided');
    }

    // Adaptive high-clarity preprocessing for receipts & tax invoices:
    // Ensure optimal resolution (~1800-2200px) and apply sharpen for crisp Thai characters and numbers
    let pipeline = sharp(imgBuffer).rotate();
    const meta = await pipeline.metadata();
    const wPx = meta.width || 800;
    const hPx = meta.height || 600;
    const maxDim = Math.max(wPx, hPx);

    // Ensure receipts have enough horizontal resolution (~1600px width) so Thai characters and numbers are sharp and legible
    if (wPx < 1400) {
      const scale = Math.min(2.5, 1600 / wPx);
      pipeline = pipeline.resize(Math.round(wPx * scale), Math.round(hPx * scale), { kernel: 'lanczos3' });
    } else if (maxDim > 3200) {
      pipeline = pipeline.resize(3200, 3200, { fit: 'inside', withoutEnlargement: true });
    }

    // Enhance contrast on colored paper invoices (green, yellow, pink, receipt paper)
    pipeline = pipeline
      .greyscale()
      .linear(1.35, -25)
      .sharpen({ sigma: 1.0 });

    const processed = await pipeline.png().toBuffer();
    const ret = await w.recognize(processed);
    const text = ret.data.text || '';
    process.send({ id, success: true, text, elapsedMs: Date.now() - start });
  } catch (err) {
    process.send({ id, success: false, error: err?.message || String(err), elapsedMs: Date.now() - start });
  }
});
