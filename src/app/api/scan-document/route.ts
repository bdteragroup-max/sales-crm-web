import { NextResponse } from 'next/server';
import { extractDocumentFields } from '@/lib/attachmentUtils';

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

    // 1. QR Code / Barcode detection on server using sharp + jsQR
    let qrPayload: string | null = null;
    try {
      const sharp = (await import('sharp')).default;
      const jsQR = (await import('jsqr')).default;
      const meta = await sharp(buffer).metadata();
      const origW = meta.width || 800;
      const origH = meta.height || 600;

      // Check at scaled dimensions for speed & accuracy
      const maxDim = Math.max(origW, origH);
      const scales = maxDim > 1200 ? [1200 / maxDim, 800 / maxDim, 1.0] : [1.0, 0.7];

      for (const s of scales) {
        let pipeline = sharp(buffer).ensureAlpha();
        if (s < 1.0) {
          pipeline = pipeline.resize(Math.round(origW * s), Math.round(origH * s));
        }
        const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
        const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (qr && qr.data) {
          qrPayload = qr.data;
          break;
        }
      }
    } catch (qrErr) {
      console.warn('Server QR scan error:', qrErr);
    }

    // 2. OCR Auto-Scan using Tesseract
    let rawText = '';
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('tha+eng');
      const ret = await worker.recognize(buffer);
      rawText = ret.data.text || '';
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('Server OCR recognize error:', ocrErr);
    }

    // 3. Extract structured business fields
    const parsed = extractDocumentFields(rawText);

    return NextResponse.json({
      success: true,
      fileName,
      qrPayload,
      barcode: qrPayload,
      extractedTaxId: parsed.taxId,
      extractedInvoiceNo: parsed.invoiceNo,
      extractedAmount: parsed.amount,
      extractedDate: parsed.date,
      extractedSupplier: parsed.supplier,
      rawTextSnippet: rawText.slice(0, 300),
    });
  } catch (error: any) {
    console.error('Scan document API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to scan document' },
      { status: 500 }
    );
  }
}
