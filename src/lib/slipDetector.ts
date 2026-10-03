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
      const detector = new BarcodeDetectorClass({
        formats: ['qr_code', 'code_128', 'ean_13', 'code_39', 'data_matrix'],
      });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();

      if (results && results.length > 0) {
        const qr = results.find((r: any) => r.format === 'qr_code');
        if (qr && qr.rawValue) {
          return {
            qrPayload: qr.rawValue,
            barcode: results[0].rawValue,
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
      // Fallback to jsQR & ZXing
      console.debug('Native BarcodeDetector not usable or failed, falling back to jsQR:', e);
    }
  }

  // 2. Fallback: Render to canvas and scan with jsQR + ZXing
  return new Promise<SlipDetectionResult>((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(url);
        try {
          const jsQR = (await import('jsqr')).default;

          // Test at optimal scales for QR detection (1000px max, 600px)
          const maxDim = Math.max(img.width, img.height);
          const scales = maxDim > 1400 ? [1400 / maxDim, 800 / maxDim, 1.0] : [1.0, 0.7];

          for (const scale of scales) {
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) continue;

            ctx.drawImage(img, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const qrCode = jsQR(imgData.data, w, h, {
              inversionAttempts: 'attemptBoth',
            });

            if (qrCode && qrCode.data) {
              return resolve({
                qrPayload: qrCode.data,
                barcode: qrCode.data,
                format: 'qr_code',
                detected: true,
              });
            }
          }

          // 3. Fallback: Try ZXing for 1D barcodes (Code 128, EAN-13)
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
            // ZXing did not find a barcode
          }

          resolve({ detected: false });
        } catch (err) {
          console.warn('Slip detector canvas execution error:', err);
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
