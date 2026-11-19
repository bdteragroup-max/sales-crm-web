import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { SurveyCompanyCode } from '@/app/lib/surveyMetadata';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function trimTransparentPng(pngBuf: Buffer, padding = 6): Buffer {
  try {
    if (pngBuf.length < 33 || !pngBuf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return pngBuf;
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    const idatChunks: Buffer[] = [];

    while (offset + 8 <= pngBuf.length) {
      const length = pngBuf.readUInt32BE(offset);
      const type = pngBuf.toString('ascii', offset + 4, offset + 8);
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd + 4 > pngBuf.length) return pngBuf;
      const data = pngBuf.subarray(dataStart, dataEnd);

      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }
      offset = dataEnd + 4;
    }

    // Only crop standard non-interlaced 8-bit RGBA PNGs cleanly; otherwise leave unchanged
    if (bitDepth !== 8 || colorType !== 6 || interlace !== 0 || width <= 0 || height <= 0) {
      return pngBuf;
    }

    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const bpp = 4;
    const rowBytes = width * bpp;
    const stride = 1 + rowBytes;
    if (inflated.length < stride * height) return pngBuf;

    const rgba = Buffer.alloc(height * rowBytes);
    for (let y = 0; y < height; y++) {
      const filter = inflated[y * stride];
      const dstRow = y * rowBytes;
      const prevRow = (y - 1) * rowBytes;
      for (let x = 0; x < rowBytes; x++) {
        const rawByte = inflated[y * stride + 1 + x];
        const left = x >= bpp ? rgba[dstRow + x - bpp] : 0;
        const up = y > 0 ? rgba[prevRow + x] : 0;
        const upLeft = x >= bpp && y > 0 ? rgba[prevRow + x - bpp] : 0;
        let recon = rawByte;
        if (filter === 1) recon = (rawByte + left) & 0xff;
        else if (filter === 2) recon = (rawByte + up) & 0xff;
        else if (filter === 3) recon = (rawByte + ((left + up) >> 1)) & 0xff;
        else if (filter === 4) {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          recon = (rawByte + pred) & 0xff;
        }
        rgba[dstRow + x] = recon;
      }
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      const rowStart = y * rowBytes;
      for (let x = 0; x < width; x++) {
        if (rgba[rowStart + x * bpp + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return pngBuf;

    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropMaxX = Math.min(width - 1, maxX + padding);
    const cropMaxY = Math.min(height - 1, maxY + padding);
    const newW = cropMaxX - cropX + 1;
    const newH = cropMaxY - cropY + 1;
    if (newW >= width && newH >= height) return pngBuf;

    const newRowBytes = newW * bpp;
    const filtered = Buffer.alloc((1 + newRowBytes) * newH);
    for (let y = 0; y < newH; y++) {
      const srcOffset = ((cropY + y) * width + cropX) * bpp;
      const dstOffset = y * (1 + newRowBytes);
      filtered[dstOffset] = 0; // filter type None
      rgba.copy(filtered, dstOffset + 1, srcOffset, srcOffset + newRowBytes);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(newW, 0);
    ihdr.writeUInt32BE(newH, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const compressed = zlib.deflateSync(filtered);
    return Buffer.concat([
      PNG_SIGNATURE,
      makePngChunk('IHDR', ihdr),
      makePngChunk('IDAT', compressed),
      makePngChunk('IEND', Buffer.alloc(0)),
    ]);
  } catch {
    return pngBuf;
  }
}

export type CommonSolarPdfAssets = {
  logoDataUri: string | null;
  companyLogos: Partial<Record<SurveyCompanyCode, string | null>>;
  fontRegularBase64: string | null;
  fontBoldBase64: string | null;
};

let cachedAssets: CommonSolarPdfAssets | null = null;

export function loadCommonSolarPdfAssets(): CommonSolarPdfAssets {
  if (cachedAssets) return cachedAssets;

  const publicDir = path.join(process.cwd(), 'public');
  const readBase64 = (relPath: string): string | null => {
    try {
      const fullPath = path.join(publicDir, relPath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath).toString('base64');
      }
    } catch (err) {
      console.warn(`Unable to load PDF asset ${relPath}:`, err);
    }
    return null;
  };

  const toTrimmedPngDataUri = (relPath: string): string | null => {
    try {
      const fullPath = path.join(publicDir, relPath);
      if (!fs.existsSync(fullPath)) return null;
      const trimmed = trimTransparentPng(fs.readFileSync(fullPath), 6);
      return `data:image/png;base64,${trimmed.toString('base64')}`;
    } catch (err) {
      console.warn(`Unable to load PDF logo ${relPath}:`, err);
      return null;
    }
  };

  const companyLogos: Partial<Record<SurveyCompanyCode, string | null>> = {
    TP: toTrimmedPngDataUri('7.png'),
    TG: toTrimmedPngDataUri('4.png'),
    TE: toTrimmedPngDataUri('6.png'),
  };

  cachedAssets = {
    logoDataUri: companyLogos.TE || companyLogos.TG || companyLogos.TP || null,
    companyLogos,
    fontRegularBase64: readBase64('Sarabun-Regular.woff2'),
    fontBoldBase64: readBase64('Sarabun-Bold.woff2'),
  };

  return cachedAssets;
}

function guessMimeFromExt(filePath: string): string {
  const ext = path.extname(filePath.split('?')[0].split('#')[0]).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
}

export async function resolveSolarImagesToDataUris(
  urls: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const uniqueUrls = Array.from(
    new Set(urls.map((u) => (u || '').trim()).filter((u) => Boolean(u) && !u.startsWith('data:')))
  );
  if (uniqueUrls.length === 0) return resolved;

  const publicDir = path.resolve(process.cwd(), 'public');

  await Promise.allSettled(
    uniqueUrls.map(async (rawUrl) => {
      try {
        if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
          const rel = rawUrl.split('?')[0].split('#')[0].replace(/^\/+/, '');
          const fullPath = path.resolve(publicDir, rel);
          if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) return;
          const stat = fs.statSync(fullPath);
          if (stat.size > MAX_IMAGE_BYTES) return;
          const mime = guessMimeFromExt(fullPath);
          resolved[rawUrl] = `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
          return;
        }

        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);
        try {
          const res = await fetch(rawUrl, { signal: controller.signal });
          if (!res.ok) return;
          const lenHdr = Number(res.headers.get('content-length') || 0);
          if (lenHdr > MAX_IMAGE_BYTES) return;
          const arrBuf = await res.arrayBuffer();
          if (arrBuf.byteLength === 0 || arrBuf.byteLength > MAX_IMAGE_BYTES) return;
          const ctHeader = (res.headers.get('content-type') || '')
            .split(';')[0]
            .trim()
            .toLowerCase();
          const mime = ctHeader.startsWith('image/') ? ctHeader : guessMimeFromExt(rawUrl);
          resolved[rawUrl] = `data:${mime};base64,${Buffer.from(arrBuf).toString('base64')}`;
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Fallback to raw URL
      }
    })
  );

  return resolved;
}

export async function renderHtmlToA4PdfBuffer(
  html: string,
  options?: {
    margin?: { top: string; bottom: string; left: string; right: string };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
  }
): Promise<Uint8Array> {
  const isLocal = process.env.NODE_ENV === 'development';
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      executablePath: isLocal
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const timer = setTimeout(() => resolve(), 8000);
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          });
        })
      );
    });

    const margin = options?.margin || {
      top: '11mm',
      bottom: '13mm',
      left: '12mm',
      right: '12mm',
    };

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: options?.displayHeaderFooter ?? true,
      headerTemplate: options?.headerTemplate || '<span></span>',
      footerTemplate:
        options?.footerTemplate ||
        '<div style="width:100%;font-size:9px;color:#64748b;text-align:right;padding:0 12mm 3mm 12mm;font-family:Sarabun,Tahoma,sans-serif;">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin,
    });

    return pdf;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

