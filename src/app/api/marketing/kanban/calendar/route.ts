import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');
    const boardId = searchParams.get('boardId');

    if (!monthStr || !yearStr || !boardId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    // Calculate start and end of the month in UTC to query safely
    // Since Timestamptz is stored, we want everything that falls within this month in Asia/Bangkok
    // So we pad the start and end by a day to be safe, filtering will happen exactly in UI or we can be precise
    
    // Bangkok is UTC+7.
    // Start of month in Bangkok: year-month-01T00:00:00+07:00 => UTC: year-(month-1)-28T17:00:00Z roughly
    const startDate = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, -7, 0, 0));

    const cards = await prisma.kanbanCard.findMany({
      where: {
        list: {
          boardId: boardId
        },
        scheduledPostDate: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        attachments: true,
        comments: true,
        activityLogs: true
      }
    });

    return NextResponse.json({ cards });
  } catch (error: any) {
    console.error('Error in GET /api/marketing/kanban/calendar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
