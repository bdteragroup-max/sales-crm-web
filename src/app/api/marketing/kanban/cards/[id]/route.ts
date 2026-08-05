import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

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
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 });
    }

    // Delete related records first due to foreign keys (or rely on Cascade if set up)
    // Assuming Prisma schema has cascade deletes, but to be safe we can just try delete
    await prisma.kanbanCard.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/marketing/kanban/cards/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
