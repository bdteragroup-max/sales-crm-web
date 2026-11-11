import { NextResponse } from 'next/server';
import { runAllMonthlyGoldEvaluations } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);
    const result = await runAllMonthlyGoldEvaluations(month, year, 'VERCEL_CRON');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running unified monthly-gold-all cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

