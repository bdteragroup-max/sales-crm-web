import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateTransportStaffMonthlyGold, evaluateLogisticsManagerMonthlyGold } from '@/app/actions/coins';

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

    // Find all users with transport/logistics roles
    const transportUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'logistics', mode: 'insensitive' } },
          { role: { contains: 'shipping', mode: 'insensitive' } },
          { role: { contains: 'จัดส่ง', mode: 'insensitive' } },
          { role: { contains: 'ขนส่ง', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of transportUsers) {
      const roleLower = (user.role || '').toLowerCase();
      
      const isManager = roleLower.includes('manager') || 
                        roleLower.includes('ผู้จัดการ') || 
                        roleLower.includes('หัวหน้า') ||
                        user.role === 'Admin';

      if (isManager) {
        const res = await evaluateLogisticsManagerMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Manager', result: res });
      } else {
        const res = await evaluateTransportStaffMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Staff', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Transport monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
