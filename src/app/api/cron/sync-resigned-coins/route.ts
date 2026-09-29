import { NextResponse } from 'next/server';
import { syncAndClawbackResignedEmployees } from '@/lib/coinReclaim';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // allow internal localhost calls or authorized calls
      const host = request.headers.get('host') || '';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    const result = await syncAndClawbackResignedEmployees();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running sync-resigned-coins cron:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
