export const BRANCH_COMMENT_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024; // 4 MB max per file
export const BRANCH_COMMENT_ATTACHMENT_MAX_COUNT = 5; // max 5 files per comment

export const BRANCH_COMMENT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type AllowedCommentAttachmentMime =
  (typeof BRANCH_COMMENT_ALLOWED_MIMES)[number];

export interface StagedCommentAttachmentPayload {
  storageBucket: string;
  storagePath: string;
  fileName: string;
  fileType: 'IMAGE' | 'DOCUMENT';
  mimeType: AllowedCommentAttachmentMime;
  fileSize: number;
  token: string;
}

const ALLOWED_EXT_RE = /\.(jpe?g|png|pdf)$/i;

export function formatAttachmentFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export function getCommentAttachmentKindLabel(
  fileName: string,
  mimeType?: string | null
): 'JPG' | 'PNG' | 'PDF' | 'FILE' {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'PDF';
  if (mimeType === 'image/png' || ext === 'png') return 'PNG';
  if (mimeType === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'JPG';
  return 'FILE';
}

/**
 * Client-side pre-flight check matching BRD limits (JPG/JPEG/PNG/PDF, max 4 MB/file).
 */
export function validateCommentAttachmentClientFile(file: {
  name: string;
  size: number;
  type?: string | null;
}): string | null {
  if (!file.name || !ALLOWED_EXT_RE.test(file.name)) {
    return `ไฟล์ "${file.name}" ไม่รองรับ (อนุญาตเฉพาะ JPG, JPEG, PNG และ PDF เท่านั้น)`;
  }

  const rawType = (file.type || '').toLowerCase().trim();
  if (
    rawType &&
    rawType !== 'application/octet-stream' &&
    rawType !== 'image/jpg' &&
    !(BRANCH_COMMENT_ALLOWED_MIMES as readonly string[]).includes(rawType)
  ) {
    return `ชนิดไฟล์ "${file.name}" ไม่ถูกต้อง (อนุญาตเฉพาะ JPG, JPEG, PNG และ PDF เท่านั้น)`;
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return `ไฟล์ "${file.name}" ว่างเปล่าหรือไม่สามารถอ่านข้อมูลได้`;
  }

  if (file.size > BRANCH_COMMENT_ATTACHMENT_MAX_BYTES) {
    return `ไฟล์ "${file.name}" มีขนาด ${formatAttachmentFileSize(file.size)} เกินกำหนดสูงสุด 4 MB ต่อไฟล์`;
  }

  return null;
}

/**
 * Verifies real binary magic bytes so renamed scripts or unsupported file types are rejected server-side.
 */
export function detectAllowedCommentAttachmentSignature(bytes: Uint8Array): {
  fileType: 'IMAGE' | 'DOCUMENT';
  mimeType: AllowedCommentAttachmentMime;
  ext: 'jpg' | 'png' | 'pdf';
} | null {
  if (!bytes || bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { fileType: 'IMAGE', mimeType: 'image/png', ext: 'png' };
  }

  // JPEG / JPG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { fileType: 'IMAGE', mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PDF: "%PDF-" optionally preceded by UTF-8 BOM / whitespace within first 1024 bytes
  const scanLimit = Math.min(bytes.length - 5, 1024);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return { fileType: 'DOCUMENT', mimeType: 'application/pdf', ext: 'pdf' };
    }
    const b = bytes[i];
    const isWhitespaceOrBom =
      b === 0x20 ||
      b === 0x09 ||
      b === 0x0a ||
      b === 0x0d ||
      b === 0x00 ||
      (i < 3 && (b === 0xef || b === 0xbb || b === 0xbf));
    if (!isWhitespaceOrBom) break;
  }

  return null;
}

export function buildCommentAttachmentStoragePath(
  contentId: string,
  originalName: string,
  ext: 'jpg' | 'png' | 'pdf',
  uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
): string {
  const safeContentId = contentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stemRaw = originalName.replace(/\.[^.]+$/, '');
  const safeStem =
    stemRaw
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'attachment';

  return `branch-content-comments/${safeContentId}/${uniqueSuffix}-${safeStem}.${ext}`;
}
