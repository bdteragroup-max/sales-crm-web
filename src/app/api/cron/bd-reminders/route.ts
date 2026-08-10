import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

// This endpoint is meant to be called by a cron job (e.g., Vercel Cron or Supabase pg_cron)
// or triggered manually via a scheduled task.
export async function GET(request: Request) {
  try {
    const now = new Date();
    
    // 1. Find Stale Projects (ON_HOLD for > 7 days or IN_PROGRESS with no update for > 14 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const staleProjects = await prisma.bDProject.findMany({
      where: {
        OR: [
          { status: 'ON_HOLD', updatedAt: { lt: sevenDaysAgo } },
          { status: 'IN_PROGRESS', updatedAt: { lt: fourteenDaysAgo } }
        ]
      },
      include: { owner: true }
    });

    // 2. Find Overdue Tasks
    const overdueTasks = await prisma.bDTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now }
      },
      include: { assignee: true, project: true }
    });

    // 3. Thursday Digest Check
    const isThursday = now.getDay() === 4;
    let digest = null;
    
    if (isThursday) {
      const activeProjects = await prisma.bDProject.findMany({
        where: { status: { in: ['PENDING_REVIEW', 'IN_PROGRESS', 'ON_HOLD'] } },
        include: { owner: true }
      });
      digest = {
        title: "Weekly Thursday BD Digest",
        activeCount: activeProjects.length,
        projects: activeProjects.map(p => ({ id: p.id, name: p.name, status: p.status, owner: p.owner?.fullName }))
      };
    }

    // In a real implementation, we would send emails or push notifications here
    // using the Notification model or an external service (SendGrid, Slack API).
    
    // For now, we log it and return it as JSON so the cron runner can record it.
    console.log(`[BD Cron] Found ${staleProjects.length} stale projects and ${overdueTasks.length} overdue tasks.`);
    if (isThursday) console.log(`[BD Cron] Generated Thursday Digest for ${digest?.activeCount} projects.`);

    return NextResponse.json({
      success: true,
      staleProjects: staleProjects.length,
      overdueTasks: overdueTasks.length,
      digestGenerated: isThursday,
      data: { staleProjects, overdueTasks, digest }
    });
    
  } catch (error) {
    console.error('Error running BD cron:', error);
    return NextResponse.json({ success: false, error: 'Failed to run cron' }, { status: 500 });
  }
}
