import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateTechnicianMonthlyGold } from '@/app/actions/coins';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    now.setDate(now.getDate() - 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Find all users with technician roles
    const technicianUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'technician', mode: 'insensitive' } },
          { role: { contains: 'ช่าง', mode: 'insensitive' } },
          { role: { contains: 'service', mode: 'insensitive' } },
          { role: { contains: 'installation', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of technicianUsers) {
      const res = await evaluateTechnicianMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Technician monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
