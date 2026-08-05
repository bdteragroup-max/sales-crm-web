import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { cookies } from 'next/headers';
import { getUser } from '@/app/lib/dal';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cardId = formData.get('cardId') as string;
    const attachmentType = (formData.get('attachmentType') as string) || 'general';

    if (!file || !cardId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Create unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `kanban/${cardId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('marketing_assets')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('marketing_assets')
      .getPublicUrl(filePath);

    // Save attachment record in DB
    const attachment = await prisma.kanbanAttachment.create({
      data: {
        cardId,
        userId: user.id,
        fileName: file.name,
        fileUrl: urlData.publicUrl,
        fileType: file.type,
        fileSize: file.size,
        attachmentType
      }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId,
        userId: user.id,
        actionType: 'ATTACHED',
        details: `Attached file: ${file.name}`
      }
    });

    return NextResponse.json(attachment);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/attachments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
