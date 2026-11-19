import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/app/lib/dal';
import {
  canAccessSolarCleaningRole,
  canManageSolarCleaningRecord,
} from '@/app/lib/solarCleaningConfig';
import { dbGetSolarCleaningById } from '@/app/lib/solarCleaningDb';
import {
  loadCommonSolarPdfAssets,
  renderHtmlToA4PdfBuffer,
  resolveSolarImagesToDataUris,
} from '@/app/lib/solarPdfAssets';
import { generateSystemCheckPdfHtml } from './systemCheckTemplate';

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

    const resolvedImageDataUris = await resolveSolarImagesToDataUris([
      record.checkInCustomerSignUrl,
      record.checkOutCustomerSignUrl,
      record.inspectorSignUrl,
    ]);

    const html = generateSystemCheckPdfHtml(record, {
      ...loadCommonSolarPdfAssets(),
      resolvedImageDataUris,
    });

    const pdfBuffer = await renderHtmlToA4PdfBuffer(html, {
      margin: { top: '10mm', bottom: '11mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: false,
    });

    const disposition = isInline ? 'inline' : 'attachment';
    const safeDocNo = record.docNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="SystemCheck_${safeDocNo}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating System Check PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate System Check PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
