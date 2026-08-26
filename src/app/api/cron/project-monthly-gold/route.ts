import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateProjectMemberMonthlyGold, evaluateProjectAdminMonthlyGold } from '@/app/actions/coins';

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

    // Find all users who are either Project Engineers or Project Admins
    const projectUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'project', mode: 'insensitive' } },
          { role: { contains: 'engineer', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of projectUsers) {
      const roleLower = (user.role || '').toLowerCase();
      
      const isProjectAdmin = roleLower.includes('admin project') || 
                             roleLower.includes('project admin') || 
                             roleLower.includes('admin') || 
                             user.role === 'Admin';

      if (isProjectAdmin) {
        const res = await evaluateProjectAdminMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Admin', result: res });
      } else {
        const res = await evaluateProjectMemberMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Engineer/Member', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Project monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
