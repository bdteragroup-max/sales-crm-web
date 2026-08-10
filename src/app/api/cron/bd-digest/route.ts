import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(request: Request) {
  try {
    // 1. Fetch overdue tasks
    const overdueTasks = await prisma.bDTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() }
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true, email: true } }
      }
    });

    // 2. Fetch blocked tasks
    const blockedTasks = await prisma.bDTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        blockedReason: { not: null }
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true, email: true } }
      }
    });

    // In a real system, you would group these by assignee and send an email or Line notification.
    // For now, we will simulate the background job payload.

    const report = {
      timestamp: new Date().toISOString(),
      overdueCount: overdueTasks.length,
      blockedCount: blockedTasks.length,
      overdueTasks: overdueTasks.map(t => ({
        projectId: t.project.id,
        projectName: t.project.name,
        taskName: t.name,
        dueDate: t.dueDate,
        assignee: t.assignee?.fullName || 'Unassigned'
      })),
      blockedTasks: blockedTasks.map(t => ({
        projectId: t.project.id,
        projectName: t.project.name,
        taskName: t.name,
        blockedReason: t.blockedReason,
        waitingOn: t.waitingOn,
        assignee: t.assignee?.fullName || 'Unassigned'
      }))
    };

    // Simulated Notification dispatch (e.g. AWS SQS, BullMQ, or direct API call to notification service)
    console.log('[Thursday Digest] Background job executed:', report);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error generating BD digest:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate digest' }, { status: 500 });
  }
}
