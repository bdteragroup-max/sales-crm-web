export interface ImageCompressionOptions {
  /** Maximum width or height in pixels after downscaling. */
  maxDimension?: number;
  /** Output JPEG quality between 0 and 1. */
  quality?: number;
  /** Preserve PNG alpha transparency instead of converting to JPEG. */
  preserveAlpha?: boolean;
}

const MAX_RAW_PHOTO_BYTES = 25 * 1024 * 1024; // 25MB raw mobile photo cap before compression

/**
 * Translate opaque Next.js Server Action / Vercel gateway errors into clear Thai messages.
 */
export function formatServerActionError(
  err: unknown,
  fallback = 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
): string {
  const rawMessage =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';

  const trimmed = rawMessage.trim();
  if (!trimmed) return fallback;

  if (
    /unexpected response was received from the server|body exceeded|payload too large|function_payload_too_large|\b413\b/i.test(
      trimmed
    )
  ) {
    return 'ข้อมูลหรือรูปภาพที่ส่งมีขนาดใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์ กรุณาลบรูปที่แนบแล้วอัปโหลดใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(trimmed)) {
    return 'การเชื่อมต่ออินเทอร์เน็ตขาดหายระหว่างส่งข้อมูล กรุณาตรวจสอบสัญญาณแล้วลองใหม่อีกครั้ง';
  }

  return trimmed;
}

/**
 * Convert a base64 `data:image/...` URI into a standard File object.
 */
export function dataUriToFile(dataUri: string, filenameBase = 'image'): File {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(dataUri.trim());
  if (!match) {
    throw new Error('รูปแบบข้อมูลรูปภาพไม่ถูกต้อง');
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s+/g, '');
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const rawExt = mimeType.split('/')[1] || 'jpg';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
  return new File([bytes], `${filenameBase}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function decodeImageToCanvas(
  file: File,
  maxDimension: number
): Promise<{ canvas: HTMLCanvasElement; origWidth: number; origHeight: number; scaled: boolean } | null> {
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  let imgEl: HTMLImageElement | null = null;

  try {
    let origWidth = 0;
    let origHeight = 0;

    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: 'from-image',
        } as ImageBitmapOptions);
      } catch {
        bitmap = await createImageBitmap(file).catch(() => null);
      }
      if (bitmap) {
        origWidth = bitmap.width;
        origHeight = bitmap.height;
      }
    }

    if (!bitmap) {
      objectUrl = URL.createObjectURL(file);
      imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = objectUrl!;
      });
      origWidth = imgEl.naturalWidth || imgEl.width;
      origHeight = imgEl.naturalHeight || imgEl.height;
    }

    if (!origWidth || !origHeight) return null;

    const longestSide = Math.max(origWidth, origHeight);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(origWidth * scale));
    const targetHeight = Math.max(1, Math.round(origHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    } else if (imgEl) {
      ctx.drawImage(imgEl, 0, 0, targetWidth, targetHeight);
    }

    return {
      canvas,
      origWidth,
      origHeight,
      scaled: targetWidth !== origWidth || targetHeight !== origHeight,
    };
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function isCompressibleImageFile(file: File): boolean {
  if (file.type === 'image/svg+xml') return false;
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|jfif|png|webp|heic|heif)$/i.test(file.name);
}

/**
 * Downscale and compress a browser image File so uploads stay lightweight and fast on mobile.
 * Falls back to the original File if running outside a browser or if decoding fails.
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !isCompressibleImageFile(file)
  ) {
    return file;
  }

  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;
  const preserveAlpha = options.preserveAlpha ?? false;

  try {
    const decoded = await decodeImageToCanvas(file, maxDimension);
    if (!decoded) return file;

    const outputMime =
      preserveAlpha && file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob = await new Promise<Blob | null>((resolve) => {
      decoded.canvas.toBlob(
        resolve,
        outputMime,
        outputMime === 'image/jpeg' ? quality : undefined
      );
    });

    if (!blob || blob.size === 0) return file;
    if (!decoded.scaled && blob.size >= file.size && file.type === outputMime) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    const nextExt = outputMime === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${baseName}.${nextExt}`, {
      type: outputMime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Compress (when image) and upload a requisition photo/signature file to Supabase Storage,
 * returning its public HTTPS URL. Falls back to `/api/upload` if direct client upload fails.
 */
export async function uploadRequisitionPhotoFile(
  file: File,
  prefix = 'req-pod',
  compressOptions?: ImageCompressionOptions
): Promise<string> {
  if (file.size > MAX_RAW_PHOTO_BYTES) {
    throw new Error(
      `ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 25MB กรุณาเลือกรูปที่มีขนาดเล็กลง`
    );
  }

  const preparedFile = await compressImageFile(file, compressOptions);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeName = (preparedFile.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${prefix}-${uniqueSuffix}-${safeName}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let lastErrorMessage = '';

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filename, preparedFile, {
          contentType: preparedFile.type || 'image/jpeg',
          upsert: false,
        });

      if (!uploadError && uploadData?.path) {
        const { data: urlData } = supabase.storage
          .from('uploadsService')
          .getPublicUrl(uploadData.path);
        if (urlData?.publicUrl) return urlData.publicUrl;
      } else if (uploadError) {
        lastErrorMessage = uploadError.message;
      }
    } catch (err) {
      lastErrorMessage = err instanceof Error ? err.message : '';
    }
  }

  const formData = new FormData();
  formData.append('file', preparedFile);
  formData.append('bucket', 'uploadsService');

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(
      errJson?.error ||
        lastErrorMessage ||
        `อัปโหลดรูปภาพไม่สำเร็จ (HTTP ${res.status})`
    );
  }

  const json = await res.json().catch(() => null);
  if (!json?.success || !json?.url) {
    throw new Error(json?.error || lastErrorMessage || 'อัปโหลดรูปภาพไม่สำเร็จ');
  }

  return String(json.url);
}

/**
 * Ensure a media string is compact enough for Server Actions:
 * existing HTTPS/relative URLs pass through unchanged, and any `data:image/...`
 * payload larger than `maxInlineChars` (0 = always upload) is compressed and uploaded to storage.
 */
export async function ensureUploadedMediaUrl(
  value: string,
  prefix = 'req-pod',
  maxInlineChars = 0,
  compressOptions?: ImageCompressionOptions
): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image/')) return trimmed;
  if (maxInlineChars > 0 && trimmed.length <= maxInlineChars) return trimmed;

  const file = dataUriToFile(trimmed, prefix);
  return uploadRequisitionPhotoFile(file, prefix, compressOptions);
}

/**
 * Normalize every photo in a list so no large base64 `data:image/...` strings are sent to Server Actions.
 */
export async function ensureUploadedPhotoList(
  items: string[],
  prefix = 'req-pod',
  compressOptions?: ImageCompressionOptions
): Promise<string[]> {
  return Promise.all(
    items
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ensureUploadedMediaUrl(item, prefix, 0, compressOptions))
  );
}

/**
 * Compress and upload a batch of user-selected image files, separating successes from failures.
 */
export async function uploadSelectedPhotoFiles(
  files: File[],
  prefix = 'req-pod',
  compressOptions?: ImageCompressionOptions
): Promise<{ uploadedUrls: string[]; failedMessages: string[] }> {
  const results = await Promise.allSettled(
    files.map((file) => uploadRequisitionPhotoFile(file, prefix, compressOptions))
  );

  const uploadedUrls: string[] = [];
  const failedMessages: string[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled') {
      uploadedUrls.push(res.value);
    } else {
      failedMessages.push(formatServerActionError(res.reason, 'อัปโหลดรูปภาพไม่สำเร็จ'));
    }
  }

  return { uploadedUrls, failedMessages };
}
