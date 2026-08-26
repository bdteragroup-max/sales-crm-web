import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateMarketingStaffMonthlyGold, evaluateMarketingManagerMonthlyGold } from '@/app/actions/coins';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    // Go back 1 day just in case it runs at 00:00 on the 1st of the next month
    now.setDate(now.getDate() - 1); 
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    // Find all users with marketing roles
    const marketingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'marketing', mode: 'insensitive' } },
          { role: { contains: 'การตลาด', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of marketingUsers) {
      const roleLower = (user.role || '').toLowerCase();
      
      const isManager = roleLower.includes('manager') || 
                        roleLower.includes('ผู้จัดการ') || 
                        user.role === 'Admin';

      if (isManager) {
        const res = await evaluateMarketingManagerMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Manager', result: res });
      } else {
        const res = await evaluateMarketingStaffMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Staff', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Marketing monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
