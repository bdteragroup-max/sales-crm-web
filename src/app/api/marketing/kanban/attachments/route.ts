import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { cookies } from 'next/headers';
import { getUser } from '@/app/lib/dal';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { cardId, fileName, fileUrl, fileType, fileSize, attachmentType = 'general', userId: clientUserId } = data;

    let user = await getUser();
    let effectiveUserId = user?.id;

    if (!effectiveUserId && clientUserId) {
      const fallbackUser = await prisma.user.findUnique({
        where: { id: clientUserId },
        select: { id: true, isActive: true }
      });
      if (fallbackUser && fallbackUser.isActive) {
        effectiveUserId = fallbackUser.id;
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fileUrl || !cardId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify card exists
    const card = await prisma.kanbanCard.findUnique({
      where: { id: cardId }
    });
    if (!card) {
      return NextResponse.json({ error: 'Card not found or has been deleted' }, { status: 404 });
    }

    // Save attachment record in DB
    const attachment = await prisma.kanbanAttachment.create({
      data: {
        cardId,
        userId: effectiveUserId,
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
        userId: effectiveUserId,
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
