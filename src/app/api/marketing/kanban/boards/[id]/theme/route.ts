import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { colorTheme } = body;

    if (!colorTheme || typeof colorTheme !== 'string') {
      return NextResponse.json({ error: 'Invalid colorTheme' }, { status: 400 });
    }

    const board = await prisma.kanbanBoard.update({
      where: {
        id
      },
      data: {
        colorTheme
      }
    });

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Error updating board theme:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
