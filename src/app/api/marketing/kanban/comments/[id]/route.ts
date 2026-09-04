import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing comment ID' }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Comment message cannot be empty' }, { status: 400 });
    }

    const existingComment = await prisma.kanbanComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const updatedComment = await prisma.kanbanComment.update({
      where: { id },
      data: {
        message: message.trim(),
        updatedAt: new Date()
      }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId: existingComment.cardId,
        userId: user.id,
        actionType: 'EDITED_COMMENT',
        details: `Edited comment`
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error: any) {
    console.error('Error in PATCH /api/marketing/kanban/comments/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing comment ID' }, { status: 400 });
    }

    const existingComment = await prisma.kanbanComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    await prisma.kanbanComment.delete({
      where: { id }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId: existingComment.cardId,
        userId: user.id,
        actionType: 'DELETED_COMMENT',
        details: `Deleted comment`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/marketing/kanban/comments/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
