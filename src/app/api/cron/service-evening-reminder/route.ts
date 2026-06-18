import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getServiceManagerLineIds, pushLineMessageToTeam, eveningOutstandingMessage } from '@/app/lib/lineNotify';

export async function GET(request: Request) {
  try {
    const teamLineIds = await getServiceManagerLineIds();
    if (teamLineIds.length === 0) {
      return NextResponse.json({ message: 'No Service Team found' }, { status: 404 });
    }

    // 1. Pending Installation Orders
    const pendingInstallations = await prisma.installationOrder.count({
      where: {
        status: { not: 'ปิด Job - ติดตั้งเสร็จสิ้น' }
      }
    });

    // 2. Pending Jobs awaiting order creation (jobType has ติดตั้ง or ตรวจเช็ค, but no InstallationOrder yet)
    const pendingJobs = await prisma.job.count({
      where: {
        OR: [
          { jobType: { contains: 'ติดตั้ง' } },
          { jobType: { contains: 'ตรวจเช็ค' } }
        ],
        installationOrders: {
          none: {} // No related installation orders
        }
      }
    });

    // 3. Pending Repairs/Claims (jobType has ซ่อม or เคลม, currentStep is not closed)
    const pendingRepairs = await prisma.job.count({
      where: {
        OR: [
          { jobType: { contains: 'ซ่อม' } },
          { jobType: { contains: 'เคลม' } }
        ],
        currentStep: { not: 'closed' }
      }
    });

    const now = new Date();
    const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const dateString = bkkTime.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const msg = eveningOutstandingMessage(pendingInstallations, pendingJobs, pendingRepairs, dateString);
    await pushLineMessageToTeam(teamLineIds, [msg], 'service');

    return NextResponse.json({ 
      success: true, 
      pendingInstallations,
      pendingJobs,
      pendingRepairs
    });
  } catch (error) {
    console.error('Error in service evening reminder cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
