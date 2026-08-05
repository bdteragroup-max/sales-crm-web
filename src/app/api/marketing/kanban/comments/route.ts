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

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
