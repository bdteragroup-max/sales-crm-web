import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import type { SurveyCompanyCode } from '@/app/lib/surveyMetadata';
import {
  collectSolarChecklistPhotos,
  generateSolarChecklistHTML,
  type SolarPdfAssets,
} from './pdfTemplate';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
let cachedStaticAssets: SolarPdfAssets | null = null;

function loadStaticPdfAssets(): SolarPdfAssets {
  if (cachedStaticAssets) return cachedStaticAssets;

  const publicDir = path.join(process.cwd(), 'public');
  const readBase64 = (relPath: string): string | null => {
    try {
      const fullPath = path.join(publicDir, relPath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath).toString('base64');
      }
    } catch (err) {
      console.warn(`Unable to load Solar PDF asset ${relPath}:`, err);
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

  cachedStaticAssets = {
    logoDataUri: companyLogos.TE || companyLogos.TG || companyLogos.TP || null,
    companyLogos,
    fontRegularBase64: readBase64('Sarabun-Regular.woff2'),
    fontBoldBase64: readBase64('Sarabun-Bold.woff2'),
  };

  return cachedStaticAssets;
}

function guessMimeFromExt(filePath: string): string {
  const ext = path.extname(filePath.split('?')[0].split('#')[0]).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
}

async function resolveImagesToDataUris(
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
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(rawUrl, { signal: controller.signal });
          if (!res.ok) return;
          const lenHdr = Number(res.headers.get('content-length') || 0);
          if (lenHdr > MAX_IMAGE_BYTES) return;

          const arrBuf = await res.arrayBuffer();
          if (arrBuf.byteLength === 0 || arrBuf.byteLength > MAX_IMAGE_BYTES) return;

          const ctHeader = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
          const mime = ctHeader.startsWith('image/') ? ctHeader : guessMimeFromExt(rawUrl);
          resolved[rawUrl] = `data:${mime};base64,${Buffer.from(arrBuf).toString('base64')}`;
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Fallback to rawUrl in HTML if server pre-fetch fails
      }
    })
  );

  return resolved;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const isInline = req.nextUrl.searchParams.get('mode') === 'inline';

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        manager: true,
        members: {
          include: {
            user: true,
          },
        },
        job: {
          select: {
            jobNumber: true,
            quotationNumber: true,
            companyCode: true,
            sellerName: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const teamMembersList = project.members
      .map((m) => `${m.user?.fullName || ''} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`)
      .filter(Boolean)
      .join(', ');
    const allMembers = [
      teamMembersList,
      project.externalTechnicians ? `${project.externalTechnicians} (ช่างภายนอก)` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const enrichedProject = {
      ...project,
      _formattedTeamMembers: allMembers,
    };

    const checklistPhotos = collectSolarChecklistPhotos(enrichedProject);
    const resolvedImageDataUris = await resolveImagesToDataUris([
      ...checklistPhotos.map((p) => p.url),
      project.supervisorSignUrl,
      project.customerSignUrl,
    ]);

    const assets: SolarPdfAssets = {
      ...loadStaticPdfAssets(),
      resolvedImageDataUris,
    };

    const html = generateSolarChecklistHTML(enrichedProject, assets);

    const isLocal = process.env.NODE_ENV === 'development';
    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      executablePath: isLocal
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

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

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:9px;color:#6b7280;text-align:right;padding:0 12mm 4mm 12mm;font-family:Sarabun,sans-serif;">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: {
        top: '11mm',
        bottom: '14mm',
        left: '12mm',
        right: '12mm',
      },
    });

    await browser.close();
    browser = null;

    const disposition = isInline ? 'inline' : 'attachment';
    const safeFileCode = (project.projectNumber || project.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="SolarChecklist_${safeFileCode}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating Solar Checklist PDF:', error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details },
      { status: 500 }
    );
  }
}
