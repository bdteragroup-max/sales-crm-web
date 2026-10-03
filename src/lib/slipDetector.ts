/**
 * Client-Side Slip & Barcode Detector
 * Decodes QR Codes and 1D/2D Barcodes from images right at the file selection stage.
 * Invariant to camera differences, angles, lighting, and phone models.
 */

export interface SlipDetectionResult {
  qrPayload?: string;
  barcode?: string;
  format?: string;
  detected: boolean;
}

export async function detectSlipQrAndBarcode(file: File): Promise<SlipDetectionResult> {
  if (!file || !file.type.startsWith('image/')) {
    return { detected: false };
  }

  // 1. Try Native Browser BarcodeDetector (Chrome, Edge, Android Chrome)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      let formats = ['qr_code', 'code_128', 'ean_13'];
      if (typeof BarcodeDetectorClass.getSupportedFormats === 'function') {
        const supported = await BarcodeDetectorClass.getSupportedFormats();
        formats = formats.filter((f) => supported.includes(f));
        if (formats.length === 0) formats = supported;
      }
      const detector = new BarcodeDetectorClass({ formats });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();

      if (results && results.length > 0) {
        const qr = results.find((r: any) => r.format === 'qr_code');
        if (qr && qr.rawValue) {
          return {
            qrPayload: qr.rawValue,
            barcode: qr.rawValue,
            format: 'qr_code',
            detected: true,
          };
        }
        return {
          barcode: results[0].rawValue,
          format: results[0].format,
          detected: true,
        };
      }
    } catch (e) {
      console.debug('Native BarcodeDetector not usable, falling back to canvas:', e);
    }
  }

  // 2. Fallback: Fast Canvas scan with jsQR + ZXing (< 50ms)
  return new Promise<SlipDetectionResult>((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(url);
        try {
          const jsQR = (await import('jsqr')).default;

          // Downscale to max 1000px for optimal speed & accuracy
          const maxDim = Math.max(img.width, img.height);
          const scale = maxDim > 1000 ? 1000 / maxDim : 1.0;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve({ detected: false });

          ctx.drawImage(img, 0, 0, w, h);
          const fullData = ctx.getImageData(0, 0, w, h);

          // Pass 1: Full image jsQR
          let qrCode = jsQR(fullData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (qrCode && qrCode.data) {
            return resolve({
              qrPayload: qrCode.data,
              barcode: qrCode.data,
              format: 'qr_code',
              detected: true,
            });
          }

          // Pass 2: Bottom 65% crop (PromptPay slip standard location)
          const bottomH = Math.round(h * 0.65);
          const bottomY = h - bottomH;
          const bottomData = ctx.getImageData(0, bottomY, w, bottomH);
          qrCode = jsQR(bottomData.data, w, bottomH, { inversionAttempts: 'attemptBoth' });
          if (qrCode && qrCode.data) {
            return resolve({
              qrPayload: qrCode.data,
              barcode: qrCode.data,
              format: 'qr_code',
              detected: true,
            });
          }

          // Pass 3: ZXing Multi-Format Reader
          try {
            const { BrowserMultiFormatReader } = await import('@zxing/library');
            const reader = new BrowserMultiFormatReader();
            const zxingResult = await reader.decodeFromImageElement(img);
            if (zxingResult && zxingResult.getText()) {
              const text = zxingResult.getText();
              const formatStr = zxingResult.getBarcodeFormat()?.toString() || 'barcode';
              return resolve({
                qrPayload: formatStr.toLowerCase().includes('qr') ? text : undefined,
                barcode: text,
                format: formatStr,
                detected: true,
              });
            }
          } catch {
            // No barcode found via ZXing
          }

          resolve({ detected: false });
        } catch (err) {
          console.warn('Slip detector canvas error:', err);
          resolve({ detected: false });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ detected: false });
      };

      img.src = url;
    } catch (err) {
      console.warn('detectSlipQrAndBarcode error:', err);
      resolve({ detected: false });
    }
  });
}

/**
 * Fast client-side image downscaling to max dimension (default 1000px)
 * Reduces multi-megabyte camera photos (5-10MB) to ~60-90KB for instant transfer & OCR in <500ms.
 */
export async function downscaleImageForScan(file: File, maxDim = 3200): Promise<Blob> {
  if (!file || !file.type.startsWith('image/')) return file;
  // If file is already under 5MB, keep 100% original full resolution for maximum OCR readability
  if (file.size <= 5 * 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const max = Math.max(img.width, img.height);
          if (max <= maxDim) {
            return resolve(file);
          }
          const scale = maxDim / max;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => resolve(blob || file),
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            0.95
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

function getCanvasDHash(ctx: CanvasRenderingContext2D, w = 9, h = 8): string {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  let hashHex = '';
  for (let y = 0; y < h; y++) {
    let byte = 0;
    for (let x = 0; x < w - 1; x++) {
      const idxL = (y * w + x) * 4;
      const idxR = (y * w + (x + 1)) * 4;
      const left = 0.299 * data[idxL] + 0.587 * data[idxL + 1] + 0.114 * data[idxL + 2];
      const right = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
      const bit = left > right ? 1 : 0;
      byte = (byte << 1) | bit;
    }
    hashHex += byte.toString(16).padStart(2, '0');
  }
  return hashHex;
}

/**
 * Computes dual visual hashes:
 * 1. visualHash: Full-frame 64-bit dHash
 * 2. coreVisualHash: Center 70% crop 64-bit dHash (immune to paperclips, desks, underlying receipts)
 */
export async function computeVisualHashes(
  file: File
): Promise<{ visualHash: string; coreVisualHash: string } | null> {
  if (!file || !file.type.startsWith('image/')) return null;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          // 1. Full Frame
          const canvas = document.createElement('canvas');
          canvas.width = 9;
          canvas.height = 8;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, 9, 8);
          const visualHash = getCanvasDHash(ctx, 9, 8);

          // 2. Core Center 70% Crop
          const cropW = Math.round(img.width * 0.7);
          const cropH = Math.round(img.height * 0.7);
          const cropX = Math.round((img.width - cropW) / 2);
          const cropY = Math.round((img.height - cropH) / 2);

          const coreCanvas = document.createElement('canvas');
          coreCanvas.width = 9;
          coreCanvas.height = 8;
          const coreCtx = coreCanvas.getContext('2d');
          if (!coreCtx) return resolve({ visualHash, coreVisualHash: visualHash });

          coreCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 9, 8);
          const coreVisualHash = getCanvasDHash(coreCtx, 9, 8);

          resolve({ visualHash, coreVisualHash });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}


