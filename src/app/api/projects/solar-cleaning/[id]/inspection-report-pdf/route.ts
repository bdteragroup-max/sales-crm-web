import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/app/lib/dal';
import {
  canAccessSolarCleaningRole,
  canManageSolarCleaningRecord,
  collectAllReportPhotoUrls,
} from '@/app/lib/solarCleaningConfig';
import { dbGetSolarCleaningById } from '@/app/lib/solarCleaningDb';
import { getSurveyCompanyMeta } from '@/app/lib/surveyMetadata';
import {
  loadCommonSolarPdfAssets,
  renderHtmlToA4PdfBuffer,
  resolveSolarImagesToDataUris,
} from '@/app/lib/solarPdfAssets';
import { generateInspectionReportPdfHtml } from './inspectionReportTemplate';

function escFooter(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessSolarCleaningRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await props.params;
    const isInline = req.nextUrl.searchParams.get('mode') === 'inline';

    const record = await dbGetSolarCleaningById(params.id);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    if (
      !canManageSolarCleaningRecord({
        userId: user.id,
        userRole: user.role,
        createdById: record.createdById,
      })
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const photoUrls = collectAllReportPhotoUrls(record);
    const resolvedImageDataUris = await resolveSolarImagesToDataUris(photoUrls);

    const commonAssets = loadCommonSolarPdfAssets();
    const companyMeta = getSurveyCompanyMeta(record.companyCode);
    const html = generateInspectionReportPdfHtml(record, {
      ...commonAssets,
      resolvedImageDataUris,
    });

    const footerFontFace = commonAssets.fontRegularBase64
      ? `<style>@font-face{font-family:'Sarabun';src:url('data:font/woff2;base64,${commonAssets.fontRegularBase64}') format('woff2');font-weight:400;font-style:normal;}</style>`
      : '';
    const footerTemplate = `${footerFontFace}<div style="width:100%;box-sizing:border-box;padding:0 12mm 3mm 12mm;font-family:'Sarabun',Tahoma,Arial,sans-serif;font-size:8.5px;color:#6b7280;"><div style="width:100%;border-top:0.5px solid #d1d5db;padding-top:3px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:#111827;">${escFooter(companyMeta.enName)} &bull; Ref: ${escFooter(record.docNumber)}</span><span>Solar PV Inspection Report &nbsp;|&nbsp; หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></span></div></div>`;

    const pdfBuffer = await renderHtmlToA4PdfBuffer(html, {
      margin: { top: '11mm', bottom: '15mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      footerTemplate,
    });

    const disposition = isInline ? 'inline' : 'attachment';
    const safeDocNo = record.docNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="InspectionReport_${safeDocNo}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating Inspection Report PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Inspection Report PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
