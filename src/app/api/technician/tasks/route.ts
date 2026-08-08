import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const whereClause: any = { status: { not: "CANCELLED" } };
    
    if (start && end) {
      whereClause.scheduledDate = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const tasks = await prisma.technicianTask.findMany({
      where: whereClause,
      include: {
        assigner: {
          select: { fullName: true }
        },
        job: {
          select: { jobNumber: true, customerName: true }
        },
        project: {
          select: { name: true }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
