import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 50MB)' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const bucket = (data.get('bucket') as string) || 'uploadsService';

    // Upload to Supabase Storage bucket
    let targetBucket = bucket;
    let uploadResult = await supabase
      .storage
      .from(targetBucket)
      .upload(filename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    // If custom bucket fails, attempt fallback to uploadsService
    if (uploadResult.error && targetBucket !== 'uploadsService') {
      console.warn(`Upload to ${targetBucket} failed, trying uploadsService:`, uploadResult.error.message);
      targetBucket = 'uploadsService';
      uploadResult = await supabase
        .storage
        .from(targetBucket)
        .upload(filename, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });
    }

    if (uploadResult.error) {
      console.error('Supabase upload error:', uploadResult.error);
      return NextResponse.json({ success: false, error: uploadResult.error.message || 'Failed to upload file to storage' }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from(targetBucket)
      .getPublicUrl(uploadResult.data.path);

    console.log(`File uploaded to Supabase Storage (${targetBucket}): ${publicUrl}`);

    // Compute 64-bit visual difference hash (dHash) and extract QR/Slip payload for images
    let visualHash: string | null = null;
    let coreVisualHash: string | null = null;
    let qrPayload: string | null = null;
    if (file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      try {
        const sharp = (await import('sharp')).default;
        const jsQR = (await import('jsqr')).default;

        // 1. Visual Hash (dHash)
        const { data: rawData } = await sharp(buffer)
          .resize(9, 8, { fit: 'fill' })
          .greyscale()
          .raw()
          .toBuffer({ resolveWithObject: true });

        let hashHex = '';
        for (let y = 0; y < 8; y++) {
          let byte = 0;
          for (let x = 0; x < 8; x++) {
            const bit = rawData[y * 9 + x] > rawData[y * 9 + (x + 1)] ? 1 : 0;
            byte = (byte << 1) | bit;
          }
          hashHex += byte.toString(16).padStart(2, '0');
        }
        visualHash = hashHex;

        // 1b. Core Visual Hash (center 70% crop invariant to borders/clutter)
        try {
          const meta = await sharp(buffer).metadata();
          const w = meta.width || 800;
          const h = meta.height || 600;
          const cropW = Math.round(w * 0.7);
          const cropH = Math.round(h * 0.7);
          const cropL = Math.round((w - cropW) / 2);
          const cropT = Math.round((h - cropH) / 2);
          const { data: coreData } = await sharp(buffer)
            .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
            .resize(9, 8, { fit: 'fill' })
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

          let coreHex = '';
          for (let y = 0; y < 8; y++) {
            let byte = 0;
            for (let x = 0; x < 8; x++) {
              const bit = coreData[y * 9 + x] > coreData[y * 9 + (x + 1)] ? 1 : 0;
              byte = (byte << 1) | bit;
            }
            coreHex += byte.toString(16).padStart(2, '0');
          }
          coreVisualHash = coreHex;
        } catch (coreErr) {
          console.debug('Core hash in upload route skipped:', coreErr);
        }

        // 2. Extract QR Code / Slip Payload
        try {
          const meta = await sharp(buffer).metadata();
          const origW = meta.width || 800;
          const origH = meta.height || 600;
          const maxDim = Math.max(origW, origH);
          const scales = maxDim > 1200 ? [1200 / maxDim, 800 / maxDim, 1.0] : [1.0, 0.7];

          for (const s of scales) {
            let pipeline = sharp(buffer).ensureAlpha();
            if (s < 1.0) {
              pipeline = pipeline.resize(Math.round(origW * s), Math.round(origH * s));
            }
            const { data: qrData, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
            const code = jsQR(new Uint8ClampedArray(qrData), info.width, info.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data) {
              qrPayload = code.data;
              break;
            }
          }
        } catch (qrErr) {
          console.debug('QR extract in upload route skipped/failed:', qrErr);
        }
      } catch (e) {
        console.warn('Could not compute visualHash or qrPayload in upload route:', e);
      }
    }

    return NextResponse.json({ success: true, url: publicUrl, visualHash, coreVisualHash, qrPayload });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    const isPayloadTooLarge = error?.message?.includes('payload') || error?.message?.includes('too large') || error?.status === 413;
    return NextResponse.json(
      { success: false, error: isPayloadTooLarge ? 'ไฟล์มีขนาดใหญ่เกินกว่าที่ระบบรองรับ (จำกัด 50MB)' : (error?.message || 'Failed to process file upload') },
      { status: isPayloadTooLarge ? 413 : 500 }
    );
  }
}
