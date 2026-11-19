import { createClient } from '@/utils/supabase/client';
import {
  compressImageFile,
  formatServerActionError,
} from '@/app/lib/requisitionPhotoUpload';

export type BranchMediaFileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface UploadedBranchMediaResult {
  fileType: BranchMediaFileType;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
}

export const MAX_BRANCH_CONTENT_FILE_BYTES = 50 * 1024 * 1024; // 50 MB max per file
const SERVER_UPLOAD_SAFE_BYTES = 3.8 * 1024 * 1024; // Safe ceiling under Vercel's 4.5 MB limit

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
};

const IMAGE_EXT_RE = /^(jpe?g|jfif|png|webp|gif|bmp|svg|heic|heif)$/i;
const VIDEO_EXT_RE = /^(mp4|m4v|mov|webm|avi|mkv)$/i;

/**
 * Determine canonical `fileType` and `mimeType` for branch-content attachments,
 * falling back to file extension when browser MIME type is blank (e.g. `.jfif` on Windows).
 */
export function resolveBranchMediaMeta(file: {
  name: string;
  type?: string | null;
}): { fileType: BranchMediaFileType; mimeType: string } {
  const ext = (file.name.split('.').pop() || '').toLowerCase().trim();
  const rawMime = (file.type || '').toLowerCase().trim();
  const mimeType =
    rawMime && rawMime !== 'application/octet-stream'
      ? rawMime
      : EXT_TO_MIME[ext] || 'application/octet-stream';

  let fileType: BranchMediaFileType = 'DOCUMENT';
  if (mimeType.startsWith('video/') || VIDEO_EXT_RE.test(ext)) {
    fileType = 'VIDEO';
  } else if (mimeType.startsWith('image/') || IMAGE_EXT_RE.test(ext)) {
    fileType = 'IMAGE';
  }

  return { fileType, mimeType };
}

/**
 * Build an ASCII-safe Supabase Storage key under `branch-content/` while keeping the file extension intact.
 */
export function buildBranchContentStoragePath(
  fileName: string,
  uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
): string {
  const lastDot = fileName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const rawExt = lastDot > 0 ? fileName.slice(lastDot + 1) : '';

  const safeStem =
    rawStem
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'media';
  const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');

  return safeExt
    ? `branch-content/${uniqueSuffix}-${safeStem}.${safeExt}`
    : `branch-content/${uniqueSuffix}-${safeStem}`;
}

/**
 * Parse a fallback `/api/upload` HTTP response safely without throwing syntax errors on non-JSON 413 pages.
 */
export function parseUploadApiErrorText(
  status: number,
  rawText: string,
  fileName: string
): string {
  const trimmed = rawText.trim();
  let parsedError = '';
  if (trimmed) {
    try {
      const json = JSON.parse(trimmed) as { error?: unknown };
      if (typeof json?.error === 'string' && json.error.trim()) {
        parsedError = json.error.trim();
      }
    } catch {
      // Plain text error body (e.g. Vercel "Request Entity Too Large")
    }
  }

  if (
    status === 413 ||
    /request entity too large|payload too large|body exceeded|function_payload_too_large/i.test(
      trimmed
    )
  ) {
    return `ไฟล์ "${fileName}" มีขนาดเกินขีดจำกัดการอัปโหลดผ่านเซิร์ฟเวอร์ (4.5MB) กรุณาลดขนาดไฟล์หรือลองอัปโหลดใหม่อีกครั้ง`;
  }

  if (parsedError) return parsedError;
  return `ไม่สามารถอัปโหลดไฟล์ "${fileName}" ได้ (HTTP ${status})`;
}

async function prepareImageWithinServerLimit(
  file: File,
  mimeType: string
): Promise<File> {
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    return file;
  }

  // First pass keeps PNG alpha & high detail for marketing artwork
  let candidate = await compressImageFile(file, {
    maxDimension: 2048,
    quality: 0.88,
    preserveAlpha: mimeType === 'image/png',
  });
  if (candidate.size <= SERVER_UPLOAD_SAFE_BYTES) return candidate;

  // Second pass converts heavy lossless PNGs to crisp high-quality JPEG
  candidate = await compressImageFile(file, {
    maxDimension: 1920,
    quality: 0.85,
    preserveAlpha: false,
  });
  if (candidate.size <= SERVER_UPLOAD_SAFE_BYTES) return candidate;

  return compressImageFile(file, {
    maxDimension: 1440,
    quality: 0.78,
    preserveAlpha: false,
  });
}

async function tryDirectSupabaseUpload(
  file: File,
  mimeType: string,
  storageNameHint: string
): Promise<{ publicUrl: string | null; errorMessage: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { publicUrl: null, errorMessage: 'Missing Supabase public configuration' };
  }

  try {
    const supabase = createClient();
    const storagePath = buildBranchContentStoragePath(storageNameHint);
    const { data, error } = await supabase.storage
      .from('uploadsService')
      .upload(storagePath, file, {
        contentType: file.type || mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error || !data?.path) {
      return {
        publicUrl: null,
        errorMessage: error?.message || 'Supabase direct upload failed',
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('uploadsService').getPublicUrl(data.path);

    if (!publicUrl) {
      return { publicUrl: null, errorMessage: 'Cannot resolve uploaded file URL' };
    }
    return { publicUrl, errorMessage: '' };
  } catch (err) {
    return {
      publicUrl: null,
      errorMessage: err instanceof Error ? err.message : 'Supabase upload exception',
    };
  }
}

async function uploadViaApiRoute(
  file: File,
  displayFileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'uploadsService');

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const rawText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(parseUploadApiErrorText(res.status, rawText, displayFileName));
  }

  let data: { success?: boolean; url?: string; error?: string } | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้องขณะอัปโหลด "${displayFileName}"`);
  }

  if (!data?.success || !data?.url) {
    throw new Error(data?.error || `ไม่สามารถอัปโหลดไฟล์ "${displayFileName}" ได้`);
  }

  return data.url;
}

/**
 * Upload branch-content media directly to Supabase Storage (bypassing Vercel's 4.5MB limit so
 * high-res PNGs and up to 50MB videos upload cleanly), with safe image-compression + JSON-safe `/api/upload` fallback.
 */
export async function uploadBranchContentMediaFile(
  file: File
): Promise<UploadedBranchMediaResult> {
  if (file.size > MAX_BRANCH_CONTENT_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `ไฟล์ "${file.name}" มีขนาด ${sizeMb}MB เกินขีดจำกัด 50MB กรุณาบีบอัดหรือแนบลิงก์ในช่อง Reference URL แทน`
    );
  }

  const { fileType, mimeType } = resolveBranchMediaMeta(file);

  // 1. Upload directly from browser to Supabase Storage to preserve full PNG/video quality > 4.5MB
  const directOriginal = await tryDirectSupabaseUpload(file, mimeType, file.name);
  if (directOriginal.publicUrl) {
    return {
      fileType,
      fileName: file.name,
      fileUrl: directOriginal.publicUrl,
      thumbnailUrl: fileType === 'IMAGE' ? directOriginal.publicUrl : undefined,
      fileSize: file.size,
      mimeType,
    };
  }

  // 2. If direct upload failed and file is a heavy image, compress within safe limits and retry direct + API
  let uploadCandidate = file;
  let effectiveMime = mimeType;
  if (fileType === 'IMAGE' && file.size > SERVER_UPLOAD_SAFE_BYTES) {
    const compressed = await prepareImageWithinServerLimit(file, mimeType);
    if (compressed.size < file.size) {
      uploadCandidate = compressed;
      effectiveMime = compressed.type || mimeType;

      const directCompressed = await tryDirectSupabaseUpload(
        uploadCandidate,
        effectiveMime,
        uploadCandidate.name
      );
      if (directCompressed.publicUrl) {
        return {
          fileType,
          fileName: file.name,
          fileUrl: directCompressed.publicUrl,
          thumbnailUrl: directCompressed.publicUrl,
          fileSize: uploadCandidate.size,
          mimeType: effectiveMime,
        };
      }
    }
  }

  // 3. Fallback to /api/upload (only when compressed/small enough, or catch 413 cleanly)
  if (uploadCandidate.size > 4.2 * 1024 * 1024 && directOriginal.errorMessage) {
    throw new Error(
      `อัปโหลดไฟล์ "${file.name}" ไปยัง Cloud Storage ไม่สำเร็จ (${formatServerActionError(
        directOriginal.errorMessage,
        'Storage error'
      )})`
    );
  }

  const fallbackUrl = await uploadViaApiRoute(uploadCandidate, file.name);
  return {
    fileType,
    fileName: file.name,
    fileUrl: fallbackUrl,
    thumbnailUrl: fileType === 'IMAGE' ? fallbackUrl : undefined,
    fileSize: uploadCandidate.size,
    mimeType: effectiveMime,
  };
}
