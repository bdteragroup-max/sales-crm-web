import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateTechnicianMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all active users with technician roles
    const technicianUsers = await prisma.user.findMany({
      where: {
        isActive: true,
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
