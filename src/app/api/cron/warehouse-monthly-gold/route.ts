import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateWarehouseMonthlyGold } from '@/app/actions/coins';

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

    // Find all users with warehouse/store roles
    const warehouseUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'warehouse', mode: 'insensitive' } },
          { role: { contains: 'store', mode: 'insensitive' } },
          { role: { contains: 'คลังสินค้า', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of warehouseUsers) {
      const res = await evaluateWarehouseMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Warehouse monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
