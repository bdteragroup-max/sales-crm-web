import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/app/lib/db';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { getUser } from '@/app/lib/dal';
import { hydrateSurveySignaturesFallback } from '@/app/lib/surveySignaturesDb';
import {
  collectSurveyAttachments,
  getElectricityBillUrl,
  isImageAttachmentUrl,
  isPdfAttachmentUrl,
  isSpreadsheetAttachmentUrl,
  isTextAttachmentUrl,
  type SurveyCompanyCode,
  type SurveyFileAttachment,
  type SurveyFilePreview,
  type SurveySpreadsheetSheetPreview,
} from '@/app/lib/surveyMetadata';
import { generateSurveyPdfHtml, type SurveyPdfAssets } from './pdfTemplate';

let cachedAssets: SurveyPdfAssets | null = null;

function loadSurveyPdfAssets(): SurveyPdfAssets {
  if (cachedAssets) return cachedAssets;

  const publicDir = path.join(process.cwd(), 'public');
  const readBase64 = (relPath: string): string | null => {
    try {
      const fullPath = path.join(publicDir, relPath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath).toString('base64');
      }
    } catch (e) {
      console.warn(`Unable to load PDF asset ${relPath}:`, e);
    }
    return null;
  };

  const toPngDataUri = (relPath: string): string | null => {
    const b64 = readBase64(relPath);
    return b64 ? `data:image/png;base64,${b64}` : null;
  };

  const companyLogos: Partial<Record<SurveyCompanyCode, string | null>> = {
    TP: toPngDataUri('7.png'),
    TG: toPngDataUri('4.png'),
    TE: toPngDataUri('6.png'),
  };

  cachedAssets = {
    logoDataUri: companyLogos.TE || companyLogos.TG || companyLogos.TP || null,
    companyLogos,
    fontRegularBase64: readBase64('Sarabun-Regular.woff2'),
    fontBoldBase64: readBase64('Sarabun-Bold.woff2'),
  };
  return cachedAssets;
}

const MAX_FETCH_BYTES = 18 * 1024 * 1024;
const MAX_EMBED_TOTAL_BYTES = 45 * 1024 * 1024;

async function resolveAmbiguousMimeTypes(survey: any): Promise<Record<string, string>> {
  const urlsToCheck = new Set<string>();
  const maybeAdd = (url?: string | null) => {
    const clean = (url || '').trim();
    if (!clean || !clean.startsWith('http')) return;
    if (
      !isImageAttachmentUrl(clean) &&
      !isPdfAttachmentUrl(clean) &&
      !isSpreadsheetAttachmentUrl(clean) &&
      !isTextAttachmentUrl(clean)
    ) {
      urlsToCheck.add(clean);
    }
  };

  maybeAdd(getElectricityBillUrl(survey?.electricityBill));
  maybeAdd(survey?.loadProfileFileUrl);
  maybeAdd(survey?.roofStructureFileUrl);
  maybeAdd(survey?.buildingPlanFileUrl);
  maybeAdd(survey?.buildingElectricalFileUrl);
  maybeAdd(survey?.electricalCabinetFileUrl);
  if (Array.isArray(survey?.documents)) {
    survey.documents.forEach((d: any) => maybeAdd(d?.fileUrl));
  }

  const mimeTypesByUrl: Record<string, string> = {};
  if (urlsToCheck.size === 0) return mimeTypesByUrl;

  await Promise.allSettled(
    Array.from(urlsToCheck).map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        const ct = res.headers.get('content-type');
        if (ct) mimeTypesByUrl[url] = ct;
      } catch {
        // ignore unreachable attachments
      } finally {
        clearTimeout(timer);
      }
    })
  );

  return mimeTypesByUrl;
}

function resolveLocalImageDataUris(urls: (string | null | undefined)[]): Record<string, string> {
  const resolved: Record<string, string> = {};
  const publicDir = path.resolve(process.cwd(), 'public');

  for (const raw of urls) {
    const clean = (raw || '').trim();
    if (!clean || !clean.startsWith('/') || clean.startsWith('//')) continue;
    if (resolved[clean]) continue;
    try {
      const rel = clean.split('?')[0].split('#')[0].replace(/^\/+/, '');
      const fullPath = path.resolve(publicDir, rel);
      if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) continue;
      const ext = path.extname(fullPath).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
          ? 'image/gif'
          : ext === '.svg'
          ? 'image/svg+xml'
          : 'image/jpeg';
      resolved[clean] = `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
    } catch {
      // ignore missing local assets
    }
  }
  return resolved;
}

function parseSpreadsheetPreview(buffer: Buffer, ext: string): SurveySpreadsheetSheetPreview[] {
  const isCsv = ext === 'csv';
  const wb = isCsv
    ? XLSX.read(buffer.toString('utf8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer' });

  const sheetNames = (wb.SheetNames || []).slice(0, 2);
  const previews: SurveySpreadsheetSheetPreview[] = [];

  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    const nonEmptyRows = rawRows.filter(
      (r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== '')
    );
    if (nonEmptyRows.length === 0) continue;

    const totalRows = nonEmptyRows.length;
    const totalCols = Math.max(...nonEmptyRows.map((r) => r.length), 1);
    const maxCols = Math.min(totalCols, 10);
    const maxDataRows = 35;

    const headerSource = nonEmptyRows[0] || [];
    const headers = Array.from({ length: maxCols }, (_, cIdx) =>
      String(headerSource[cIdx] ?? `Col ${cIdx + 1}`).trim()
    );
    const bodySource = nonEmptyRows.slice(1, 1 + maxDataRows);
    const rows = bodySource.map((r) =>
      Array.from({ length: maxCols }, (_, cIdx) => String(r[cIdx] ?? '').trim())
    );

    previews.push({
      sheetName: name,
      headers,
      rows,
      totalRows: Math.max(totalRows - 1, 0),
      totalCols,
      truncatedRows: totalRows - 1 > maxDataRows,
      truncatedCols: totalCols > maxCols,
    });
  }

  return previews;
}

type PreparedFilePayload = {
  preview: SurveyFilePreview;
  bytes?: Buffer;
  mimeType?: string;
  extDoc?: PDFDocument;
};

async function fetchAttachmentBytes(
  fileUrl: string
): Promise<{ bytes: Buffer | null; contentType: string; error?: string }> {
  const clean = fileUrl.trim();
  if (clean.startsWith('data:')) {
    const match = clean.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) return { bytes: null, contentType: '', error: 'รูปแบบ data URL ไม่ถูกต้อง' };
    return { bytes: Buffer.from(match[2], 'base64'), contentType: match[1].toLowerCase() };
  }

  if (clean.startsWith('/') && !clean.startsWith('//')) {
    const publicDir = path.resolve(process.cwd(), 'public');
    const rel = clean.split('?')[0].split('#')[0].replace(/^\/+/, '');
    const fullPath = path.resolve(publicDir, rel);
    if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) {
      return { bytes: null, contentType: '', error: 'ไม่พบไฟล์ในเครื่องแม่ข่าย' };
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_FETCH_BYTES) {
      return { bytes: null, contentType: '', error: 'ไฟล์มีขนาดใหญ่เกิน 18MB (แนบลิงก์แทน)' };
    }
    return { bytes: fs.readFileSync(fullPath), contentType: '' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(clean, { signal: controller.signal });
    if (!res.ok) {
      return { bytes: null, contentType: '', error: `ดาวน์โหลดไม่สำเร็จ (HTTP ${res.status})` };
    }
    const lenHdr = Number(res.headers.get('content-length') || 0);
    if (lenHdr > MAX_FETCH_BYTES) {
      return { bytes: null, contentType: res.headers.get('content-type') || '', error: 'ไฟล์มีขนาดใหญ่เกิน 18MB (แนบลิงก์แทน)' };
    }
    const arrBuf = await res.arrayBuffer();
    if (arrBuf.byteLength > MAX_FETCH_BYTES) {
      return { bytes: null, contentType: res.headers.get('content-type') || '', error: 'ไฟล์มีขนาดใหญ่เกิน 18MB (แนบลิงก์แทน)' };
    }
    return {
      bytes: Buffer.from(arrBuf),
      contentType: (res.headers.get('content-type') || '').toLowerCase(),
    };
  } catch (err: any) {
    return {
      bytes: null,
      contentType: '',
      error: err?.name === 'AbortError' ? 'หมดเวลาดาวน์โหลดไฟล์แนบ' : 'ไม่สามารถดึงไฟล์แนบได้',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function prepareAttachmentPayloads(
  fileAttachments: SurveyFileAttachment[],
  mimeTypesByUrl: Record<string, string>
): Promise<PreparedFilePayload[]> {
  if (fileAttachments.length === 0) return [];

  const results = await Promise.all(
    fileAttachments.map(async (att): Promise<PreparedFilePayload> => {
      const basePreview: SurveyFilePreview = { ...att };
      const fetched = await fetchAttachmentBytes(att.fileUrl);
      if (!fetched.bytes) {
        return {
          preview: { ...basePreview, fetchError: fetched.error || 'ไม่สามารถอ่านไฟล์ได้' },
        };
      }

      const bytes = fetched.bytes;
      const detectedMime = (fetched.contentType || mimeTypesByUrl[att.fileUrl] || '').split(';')[0].trim();
      const isPdfMagic = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
      let effectiveKind = att.kind;
      if (effectiveKind === 'other' && (isPdfMagic || detectedMime.includes('pdf'))) {
        effectiveKind = 'pdf';
      }

      basePreview.kind = effectiveKind;
      basePreview.byteSize = bytes.length;

      if (effectiveKind === 'pdf') {
        try {
          const extDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          basePreview.pdfPageCount = extDoc.getPageCount();
          basePreview.pdfMerged = true;
          basePreview.embeddedInPdf = true;
          return { preview: basePreview, bytes, mimeType: detectedMime || 'application/pdf', extDoc };
        } catch {
          return {
            preview: {
              ...basePreview,
              embeddedInPdf: true,
              fetchError: 'ไฟล์ PDF อาจเข้ารหัสหรือไม่สามารถต่อหน้าอัตโนมัติ (แนบไฟล์ต้นฉบับ/ลิงก์แทน)',
            },
            bytes,
            mimeType: detectedMime || 'application/pdf',
          };
        }
      }

      if (effectiveKind === 'spreadsheet') {
        try {
          const sheets = parseSpreadsheetPreview(bytes, att.ext);
          basePreview.sheets = sheets;
        } catch {
          basePreview.fetchError = 'ไม่สามารถอ่านตารางอัตโนมัติ (แนบไฟล์ต้นฉบับใน PDF แทน)';
        }
        basePreview.embeddedInPdf = true;
        return {
          preview: basePreview,
          bytes,
          mimeType:
            detectedMime ||
            (att.ext === 'csv'
              ? 'text/csv'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        };
      }

      if (effectiveKind === 'text') {
        const fullText = bytes.toString('utf8');
        const lines = fullText.split(/\r?\n/);
        const sliced = lines.slice(0, 60).join('\n');
        const maxChars = 4500;
        basePreview.textTruncated = lines.length > 60 || sliced.length > maxChars;
        basePreview.textPreview =
          sliced.length > maxChars ? `${sliced.slice(0, maxChars)}\n... (ตัดทอนบางส่วน)` : sliced;
        basePreview.embeddedInPdf = true;
        return { preview: basePreview, bytes, mimeType: detectedMime || 'text/plain' };
      }

      basePreview.embeddedInPdf = true;
      return {
        preview: basePreview,
        bytes,
        mimeType: detectedMime || 'application/octet-stream',
      };
    })
  );

  // Respect total embedded file cap cleanly
  let accumulatedEmbedBytes = 0;
  for (const item of results) {
    if (item.bytes) {
      if (accumulatedEmbedBytes + item.bytes.length <= MAX_EMBED_TOTAL_BYTES) {
        accumulatedEmbedBytes += item.bytes.length;
        item.preview.embeddedInPdf = true;
      } else {
        item.preview.embeddedInPdf = false;
      }
    }
  }

  return results;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  let browser: any = null;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const surveyId = params.id;
    const mode = request.nextUrl.searchParams.get('mode');
    const isInline = mode === 'inline';

    const rawSurvey = await prisma.siteSurvey.findUnique({
      where: { id: surveyId },
      include: {
        salesperson: { select: { id: true, fullName: true } },
        estimatedByUser: { select: { id: true, fullName: true } },
        company: {
          select: {
            id: true,
            companyName: true,
            address: true,
            subDistrict: true,
            district: true,
            province: true,
            postalCode: true,
          },
        },
        electricalProfile: true,
        usageBehavior: true,
        tariffSelection: {
          include: { tiers: true },
        },
        structure: {
          include: { roofAges: true },
        },
        qa: true,
        photos: true,
        documents: true,
        electricityBill: true,
      },
    });

    if (!rawSurvey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const survey = (await hydrateSurveySignaturesFallback(prisma, rawSurvey))!;

    const mimeTypesByUrl = await resolveAmbiguousMimeTypes(survey);
    const { visualAttachments, fileAttachments } = collectSurveyAttachments(survey, mimeTypesByUrl);
    const attachmentPayloads = await prepareAttachmentPayloads(fileAttachments, mimeTypesByUrl);
    const resolvedImageDataUris = resolveLocalImageDataUris([
      ...visualAttachments.map((v) => v.fileUrl),
      survey.salesSignatureUrl,
      survey.projectSignatureUrl,
    ]);

    const assets = {
      ...loadSurveyPdfAssets(),
      mimeTypesByUrl,
      filePreviews: attachmentPayloads.map((p) => p.preview),
      resolvedImageDataUris,
    };
    const htmlContent = generateSurveyPdfHtml(survey, assets);

    const isLocal = process.env.NODE_ENV === 'development';

    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      executablePath: isLocal
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });

    await page.evaluate(() => document.fonts.ready);

    // Wait for all embedded site photos & image attachments with safety timeout
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

    const rawPdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '11mm',
        bottom: '13mm',
        left: '12mm',
        right: '12mm',
      },
    });

    await browser.close();
    browser = null;

    let finalPdfBytes: Uint8Array = rawPdfBuffer;

    // Merge attached PDFs (append pages) AND embed all uploaded non-image files inside PDF /EmbeddedFiles
    const hasMergeablePdf = attachmentPayloads.some((p) => Boolean(p.extDoc));
    const hasEmbeddableFile = attachmentPayloads.some((p) => p.preview.embeddedInPdf && Boolean(p.bytes));
    if (hasMergeablePdf || hasEmbeddableFile) {
      try {
        const mergedPdf = await PDFDocument.load(rawPdfBuffer);
        const usedEmbedNames = new Set<string>();

        for (const payload of attachmentPayloads) {
          if (payload.extDoc) {
            try {
              const copied = await mergedPdf.copyPages(payload.extDoc, payload.extDoc.getPageIndices());
              copied.forEach((p) => mergedPdf.addPage(p));
            } catch (copyErr) {
              console.warn(`Could not copy PDF pages for ${payload.preview.title}:`, copyErr);
            }
          }

          if (payload.preview.embeddedInPdf && payload.bytes) {
            try {
              let attachName = payload.preview.fileName || 'attachment';
              if (usedEmbedNames.has(attachName)) {
                attachName = `${usedEmbedNames.size + 1}_${attachName}`;
              }
              usedEmbedNames.add(attachName);

              await mergedPdf.attach(payload.bytes, attachName, {
                mimeType: payload.mimeType || 'application/octet-stream',
                description: `${payload.preview.categoryLabel}: ${payload.preview.title}`,
              });
            } catch (attachErr) {
              console.warn(`Could not embed file attachment ${payload.preview.fileName}:`, attachErr);
            }
          }
        }

        finalPdfBytes = await mergedPdf.save();
      } catch (mergeErr) {
        console.warn('PDF merge/attach fallback to main report:', mergeErr);
      }
    }

    const disposition = isInline ? 'inline' : 'attachment';
    return new NextResponse(Buffer.from(finalPdfBytes) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="Survey_${survey.surveyNumber || survey.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error generating Survey PDF:', error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
