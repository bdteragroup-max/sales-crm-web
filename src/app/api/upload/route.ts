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

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    const isPayloadTooLarge = error?.message?.includes('payload') || error?.message?.includes('too large') || error?.status === 413;
    return NextResponse.json(
      { success: false, error: isPayloadTooLarge ? 'ไฟล์มีขนาดใหญ่เกินกว่าที่ระบบรองรับ (จำกัด 50MB)' : (error?.message || 'Failed to process file upload') },
      { status: isPayloadTooLarge ? 413 : 500 }
    );
  }
}
