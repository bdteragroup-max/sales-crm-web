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

    // Attempt to extract bucket name and relative path from fileUrl
    let bucketName = 'marketing_assets';
    let storagePath: string | null = null;

    if (attachment.fileUrl.includes('uploadsService/')) {
      bucketName = 'uploadsService';
      storagePath = attachment.fileUrl.split('uploadsService/')[1] || null;
    } else if (attachment.fileUrl.includes('marketing_assets/')) {
      bucketName = 'marketing_assets';
      storagePath = attachment.fileUrl.split('marketing_assets/')[1] || null;
    }

    if (storagePath) {
      try {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } }
        );
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([decodeURIComponent(storagePath)]);

        if (deleteError) {
          console.error('Error deleting file from Supabase:', deleteError);
        }
      } catch (err) {
        console.error('Exception deleting file from Supabase:', err);
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
