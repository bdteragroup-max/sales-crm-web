import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { boardId, name } = data;

    if (!boardId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lastList = await prisma.kanbanList.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' }
    });

    const newPosition = lastList ? lastList.position + 1000 : 1000;

    const list = await prisma.kanbanList.create({
      data: {
        boardId,
        name,
        position: newPosition
      },
      include: {
        cards: true
      }
    });

    revalidatePath('/marketing/kanban');
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/lists:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, name, position, color, orderedListIds } = data;

    if (Array.isArray(orderedListIds) && orderedListIds.length > 0) {
      const validIds = orderedListIds.filter((lid: unknown): lid is string => typeof lid === 'string' && lid.length > 0);
      await prisma.$transaction(
        validIds.map((listId, idx) =>
          prisma.kanbanList.update({
            where: { id: listId },
            data: { position: (idx + 1) * 1000 }
          })
        )
      );
      revalidatePath('/marketing/kanban');
      return NextResponse.json({ success: true, orderedListIds: validIds });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing list ID' }, { status: 400 });
    }

    const list = await prisma.kanbanList.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(position !== undefined && { position }),
        ...(color !== undefined && { color })
      }
    });

    revalidatePath('/marketing/kanban');
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Error in PUT /api/marketing/kanban/lists:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing list ID' }, { status: 400 });
    }

    await prisma.kanbanList.delete({
      where: { id }
    });

    revalidatePath('/marketing/kanban');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/marketing/kanban/lists:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
