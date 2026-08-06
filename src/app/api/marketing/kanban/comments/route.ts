import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { cardId, message } = data;

    if (!cardId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const comment = await prisma.kanbanComment.create({
      data: {
        cardId,
        userId: user.id,
        message
      },
      include: {
        card: true
      }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId,
        userId: user.id,
        actionType: 'COMMENTED',
        details: 'Added a comment'
      }
    });

    // Parse mentions and create notifications
    try {
      const usersList = await prisma.user.findMany({ select: { id: true, fullName: true } });
      const sortedUsers = usersList.filter(u => u.fullName).sort((a, b) => b.fullName.length - a.fullName.length);
      const mentionedUserIds = new Set<string>();
      
      let tempMessage = message;
      for (const u of sortedUsers) {
        if (tempMessage.includes(`@${u.fullName}`)) {
          mentionedUserIds.add(u.id);
          tempMessage = tempMessage.split(`@${u.fullName}`).join(''); // Remove to prevent substring matches
        }
      }

      for (const mentionedId of Array.from(mentionedUserIds)) {
        if (mentionedId !== user.id) {
          await prisma.notification.create({
            data: {
              userId: mentionedId,
              title: 'มีคนกล่าวถึงคุณ (Mention)',
              message: `${user.fullName} กล่าวถึงคุณในความคิดเห็นในการ์ด "${comment.card?.title || 'Kanban'}"`,
              type: 'KANBAN_MENTION',
              linkUrl: '/marketing/kanban'
            }
          });
        }
      }
    } catch (mentionError) {
      console.error('Failed to parse mentions or send notifications:', mentionError);
    }

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
