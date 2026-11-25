import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { resolveUserBranchPermissions } from '@/app/actions/branchContent';
import { hasAllowedBranchAccess } from '@/app/lib/branchContentTypes';
import {
  BRANCH_COMMENT_ATTACHMENT_MAX_BYTES,
  buildCommentAttachmentStoragePath,
  detectAllowedCommentAttachmentSignature,
} from '@/app/lib/branchContentCommentAttachments';
import {
  COMMENT_ATTACHMENT_STORAGE_BUCKET,
  createCommentAttachmentToken,
  getCommentAttachmentSupabaseClient,
} from '@/app/lib/branchContentCommentAttachmentServer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, permissions } = await resolveUserBranchPermissions();
    if (!user || !permissions) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์' },
        { status: 401 }
      );
    }

    const canStageAttachment = Boolean(
      permissions.canComment ||
        permissions.canReview ||
        permissions.canRequestRevision ||
        permissions.canApprove
    );

    if (!canStageAttachment) {
      return NextResponse.json(
        {
          success: false,
          error: '403 Forbidden: คุณยังไม่ได้รับสิทธิ์คอมเมนต์และแนบไฟล์ในบอร์ดคอนเทนต์สาขา',
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const contentId = String(formData.get('contentId') || '').trim();
    const file = formData.get('file') as File | null;

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสการ์ดคอนเทนต์ (contentId)' },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกไฟล์ที่ต้องการแนบ' },
        { status: 400 }
      );
    }

    const content = await prisma.branchContent.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        branchId: true,
        branchName: true,
        createdById: true,
        assigneeId: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการ์ดคอนเทนต์นี้' },
        { status: 404 }
      );
    }

    if (!permissions.canViewAllBranches) {
      const canAccessCard =
        hasAllowedBranchAccess(permissions, content.branchId, content.branchName) ||
        content.createdById === user.id ||
        content.assigneeId === user.id;

      if (!canAccessCard) {
        return NextResponse.json(
          { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์เข้าถึงงานของสาขาอื่น' },
          { status: 403 }
        );
      }
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      return NextResponse.json(
        { success: false, error: 'ไฟล์ที่เลือกไม่มีข้อมูล (0 bytes)' },
        { status: 400 }
      );
    }

    if (file.size > BRANCH_COMMENT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไฟล์มีขนาดเกินกำหนดสูงสุด 4 MB ต่อไฟล์',
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.byteLength > BRANCH_COMMENT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไฟล์มีขนาดเกินกำหนดสูงสุด 4 MB ต่อไฟล์',
        },
        { status: 413 }
      );
    }

    const signature = detectAllowedCommentAttachmentSignature(bytes);
    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ชนิดไฟล์จริงไม่ถูกต้องหรือไม่ปลอดภัย (รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ PDF เท่านั้น)',
        },
        { status: 400 }
      );
    }

    const storagePath = buildCommentAttachmentStoragePath(
      contentId,
      file.name || `attachment.${signature.ext}`,
      signature.ext
    );

    const supabase = getCommentAttachmentSupabaseClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(COMMENT_ATTACHMENT_STORAGE_BUCKET)
      .upload(storagePath, Buffer.from(bytes), {
        contentType: signature.mimeType,
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      console.error('[BranchContentCommentUpload] Supabase error:', uploadError);
      return NextResponse.json(
        {
          success: false,
          error: uploadError?.message || 'อัปโหลดไฟล์ไปยัง Storage ไม่สำเร็จ',
        },
        { status: 500 }
      );
    }

    const safeFileName = (file.name || `attachment.${signature.ext}`).slice(0, 255);
    const token = await createCommentAttachmentToken({
      contentId,
      userId: user.id,
      storageBucket: COMMENT_ATTACHMENT_STORAGE_BUCKET,
      storagePath: uploadData.path,
      fileName: safeFileName,
      fileType: signature.fileType,
      mimeType: signature.mimeType,
      fileSize: bytes.byteLength,
    });

    return NextResponse.json({
      success: true,
      attachment: {
        storageBucket: COMMENT_ATTACHMENT_STORAGE_BUCKET,
        storagePath: uploadData.path,
        fileName: safeFileName,
        fileType: signature.fileType,
        mimeType: signature.mimeType,
        fileSize: bytes.byteLength,
        token,
      },
    });
  } catch (error: unknown) {
    console.error('[BranchContentCommentUpload] error:', error);
    const message = error instanceof Error ? error.message : 'อัปโหลดไฟล์ไม่สำเร็จ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
