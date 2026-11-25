import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { resolveUserBranchPermissions } from '@/app/actions/branchContent';
import { hasAllowedBranchAccess } from '@/app/lib/branchContentTypes';
import { detectAllowedCommentAttachmentSignature } from '@/app/lib/branchContentCommentAttachments';
import {
  getCommentAttachmentSupabaseClient,
  sanitizeHeaderFilename,
} from '@/app/lib/branchContentCommentAttachmentServer';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, permissions } = await resolveUserBranchPermissions();
    if (!user || !permissions) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const attachment = await prisma.branchContentCommentAttachment.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            branchId: true,
            branchName: true,
            createdById: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (!permissions.canViewAllBranches) {
      const canAccessCard =
        hasAllowedBranchAccess(
          permissions,
          attachment.content.branchId,
          attachment.content.branchName
        ) ||
        attachment.content.createdById === user.id ||
        attachment.content.assigneeId === user.id;

      if (!canAccessCard) {
        return NextResponse.json(
          { error: '403 Forbidden: คุณไม่มีสิทธิ์เข้าถึงไฟล์แนบของสาขาอื่น' },
          { status: 403 }
        );
      }
    }

    const supabase = getCommentAttachmentSupabaseClient();
    const { data: blob, error: downloadError } = await supabase.storage
      .from(attachment.storageBucket)
      .download(attachment.storagePath);

    if (downloadError || !blob) {
      console.error('[BranchContentCommentAttachmentGet] Storage error:', downloadError);
      return NextResponse.json(
        { error: 'ไม่พบไฟล์ใน Storage หรือไม่สามารถดาวน์โหลดได้' },
        { status: 404 }
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const verifiedSig = detectAllowedCommentAttachmentSignature(bytes);
    if (!verifiedSig) {
      return NextResponse.json(
        { error: 'ไฟล์ไม่ผ่านการตรวจสอบความปลอดภัย' },
        { status: 400 }
      );
    }

    const isDownload = request.nextUrl.searchParams.get('download') === '1';
    const { asciiFallback, utf8Encoded } = sanitizeHeaderFilename(attachment.fileName);
    const disposition = isDownload ? 'attachment' : 'inline';

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': verifiedSig.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: unknown) {
    console.error('[BranchContentCommentAttachmentGet] error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงไฟล์แนบได้' },
      { status: 500 }
    );
  }
}
