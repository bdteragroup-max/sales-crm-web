import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { cookies } from 'next/headers';
import { getUser } from '@/app/lib/dal';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.kanbanAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Attempt to extract the relative path in the bucket from the fileUrl
    // Typical URL: https://.../storage/v1/object/public/marketing_assets/kanban/cardId/123.jpg
    const bucketName = 'marketing_assets';
    let storagePath = null;
    
    if (attachment.fileUrl.includes(bucketName)) {
      const parts = attachment.fileUrl.split(`${bucketName}/`);
      if (parts.length > 1) {
        storagePath = parts[1];
      }
    }

    if (storagePath) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([storagePath]);

      if (deleteError) {
        console.error('Error deleting file from Supabase:', deleteError);
        // We log the error but still proceed to delete the DB record.
      }
    }

    await prisma.kanbanAttachment.delete({
      where: { id }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId: attachment.cardId,
        userId: user.id,
        actionType: 'deleted attachment',
        details: `Deleted file ${attachment.fileName}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
