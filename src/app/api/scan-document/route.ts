import { NextResponse } from 'next/server';
import { extractDocumentFields } from '@/lib/attachmentUtils';
import { fastOcrManager } from '@/lib/ocrService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file: File | null = formData.get('file') as unknown as File;
    const imageUrl = formData.get('imageUrl') as string | null;

    let buffer: Buffer | null = null;
    let fileName = '';

    if (file && typeof file.arrayBuffer === 'function') {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      fileName = file.name;
    } else if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json({ success: false, error: 'Could not fetch image URL' }, { status: 400 });
      }
      const arr = await imgRes.arrayBuffer();
      buffer = Buffer.from(arr);
      fileName = imageUrl.split('/').pop() || 'image.jpg';
    }

    if (!buffer) {
      return NextResponse.json({ success: false, error: 'No file or image provided' }, { status: 400 });
    }

    const skipQr = formData.get('skipQr') === 'true';
    if (formData.get('restart') === 'true') {
      fastOcrManager.restart();
    }

    // 1. Fast QR Code / Barcode detection (only if not already scanned by client)
    let qrPayload: string | null = null;
    if (!skipQr) {
      try {
        const sharp = (await import('sharp')).default;
        const jsQR = (await import('jsqr')).default;
        const meta = await sharp(buffer).metadata();
        const origW = meta.width || 800;
        const origH = meta.height || 600;

        // Downscale to max 800px for instant single-pass QR decode (< 40ms)
        const maxDim = Math.max(origW, origH);
        const scale = maxDim > 800 ? 800 / maxDim : 1.0;

        let pipeline = sharp(buffer).ensureAlpha();
        if (scale < 1.0) {
          pipeline = pipeline.resize(Math.round(origW * scale), Math.round(origH * scale));
        }
        const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
        const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
          inversionAttempts: 'dontInvert',
        });
        if (qr && qr.data) {
          qrPayload = qr.data;
        }
      } catch (qrErr) {
        console.warn('Server QR scan error:', qrErr);
      }
    }

    // 2. Fast OCR Auto-Scan via dedicated warm worker process
    let rawText = '';
    try {
      const ocrRes = await fastOcrManager.recognizeBuffer(buffer, 25000);
      rawText = ocrRes.text || '';
    } catch (ocrErr) {
      console.warn('Server OCR recognize error:', ocrErr);
    }

    // 3. Extract structured business fields
    const parsed = extractDocumentFields(rawText);

    return NextResponse.json({
      success: true,
      fileName,
      qrPayload: qrPayload || null,
      barcode: qrPayload || null,
      extractedTaxId: parsed.taxId,
      extractedInvoiceNo: parsed.invoiceNo,
      extractedAmount: parsed.amount,
      extractedDate: parsed.date,
      extractedSupplier: parsed.supplier,
      extractedPhone: parsed.phone,
      extractedDescription: parsed.itemsSummary,
      extractedLineItems: parsed.lineItems,
      distinctiveTokens: parsed.distinctiveTokens,
      rawTextSnippet: rawText.slice(0, 2000),
    });
  } catch (error: any) {
    console.error('Scan document API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to scan document' },
      { status: 500 }
    );
  }
}
