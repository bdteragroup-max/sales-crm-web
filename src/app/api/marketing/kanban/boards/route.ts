export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/app/lib/dal';
import { getMarketingBoardData } from '@/app/actions/marketingKanban';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await getMarketingBoardData(user.id);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({ board: res.board, users: res.users });
  } catch (error: any) {
    console.error('Error in GET /api/marketing/kanban/boards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

