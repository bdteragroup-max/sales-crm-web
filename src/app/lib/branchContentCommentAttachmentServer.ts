import 'server-only';
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import {
  BRANCH_COMMENT_ALLOWED_MIMES,
  BRANCH_COMMENT_ATTACHMENT_MAX_BYTES,
  type AllowedCommentAttachmentMime,
  type StagedCommentAttachmentPayload,
} from '@/app/lib/branchContentCommentAttachments';

export const COMMENT_ATTACHMENT_STORAGE_BUCKET = 'uploadsService';

function getSigningKey(): Uint8Array {
  const rawSecret =
    process.env.SESSION_SECRET ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'branch-content-comment-att-key';
  return crypto.createHash('sha256').update(rawSecret).digest();
}

export function getCommentAttachmentSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('ไม่ได้ตั้งค่าการเชื่อมต่อ Cloud Storage');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export async function createCommentAttachmentToken(params: {
  contentId: string;
  userId: string;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  fileType: 'IMAGE' | 'DOCUMENT';
  mimeType: AllowedCommentAttachmentMime;
  fileSize: number;
}): Promise<string> {
  return new SignJWT({
    kind: 'bc_comment_att',
    contentId: params.contentId,
    userId: params.userId,
    storageBucket: params.storageBucket,
    storagePath: params.storagePath,
    fileName: params.fileName,
    fileType: params.fileType,
    mimeType: params.mimeType,
    fileSize: params.fileSize,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getSigningKey());
}

export async function verifyCommentAttachmentToken(
  token: string,
  expected: { contentId: string; userId: string }
): Promise<Omit<StagedCommentAttachmentPayload, 'token'> | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });

    if (payload.kind !== 'bc_comment_att') return null;
    if (payload.contentId !== expected.contentId) return null;
    if (payload.userId !== expected.userId) return null;

    const storageBucket = String(payload.storageBucket || '');
    const storagePath = String(payload.storagePath || '');
    const fileName = String(payload.fileName || '').slice(0, 255);
    const fileType = payload.fileType === 'DOCUMENT' ? 'DOCUMENT' : 'IMAGE';
    const mimeType = String(payload.mimeType || '') as AllowedCommentAttachmentMime;
    const fileSize = Number(payload.fileSize);

    if (
      !storageBucket ||
      !storagePath.startsWith(`branch-content-comments/${expected.contentId.replace(/[^a-zA-Z0-9_-]/g, '_')}/`) ||
      !fileName ||
      !(BRANCH_COMMENT_ALLOWED_MIMES as readonly string[]).includes(mimeType) ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > BRANCH_COMMENT_ATTACHMENT_MAX_BYTES
    ) {
      return null;
    }

    return {
      storageBucket,
      storagePath,
      fileName,
      fileType,
      mimeType,
      fileSize,
    };
  } catch {
    return null;
  }
}

export function sanitizeHeaderFilename(fileName: string): {
  asciiFallback: string;
  utf8Encoded: string;
} {
  const cleanName = (fileName || 'attachment').replace(/[\r\n"]/g, '_');
  const asciiFallback = cleanName.replace(/[^\x20-\x7e]/g, '_') || 'attachment';
  const utf8Encoded = encodeURIComponent(cleanName);
  return { asciiFallback, utf8Encoded };
}
