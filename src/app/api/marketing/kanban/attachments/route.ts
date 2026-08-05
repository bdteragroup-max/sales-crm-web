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

    const data = await request.json();
    const { cardId, fileName, fileUrl, fileType, fileSize, attachmentType = 'general' } = data;

    if (!fileUrl || !cardId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save attachment record in DB
    const attachment = await prisma.kanbanAttachment.create({
      data: {
        cardId,
        userId: user.id,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        attachmentType
      }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId,
        userId: user.id,
        actionType: 'ATTACHED',
        details: `Attached file: ${fileName}`
      }
    });

    return NextResponse.json(attachment);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/attachments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
