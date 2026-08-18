import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfToday = new Date(today);
    
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const now = new Date();
    const notifications = [];

    // 1. Check BD Projects
    const projectsToNotify = await prisma.bDProject.findMany({
      where: {
        deadline: { lte: twoDaysFromNow },
        status: { not: "COMPLETED" },
        OR: [
          { deadlineNotifiedAt: null },
          { deadlineNotifiedAt: { lt: startOfToday } },
        ]
      },
      include: { owner: true }
    });

    for (const project of projectsToNotify) {
      if (!project.ownerId) continue;
      
      const isOverdue = project.deadline && project.deadline < now;
      const title = isOverdue ? "แจ้งเตือนโปรเจกต์เกินกำหนด" : "แจ้งเตือนโปรเจกต์ใกล้ถึงกำหนด";
      const message = `โปรเจกต์ "${project.name}" ${isOverdue ? "เลยกำหนดส่งแล้ว" : "จะถึงกำหนดส่งในเร็วๆ นี้"}`;

      notifications.push({
        userId: project.ownerId,
        title,
        message,
        type: "BD_PROJECT_DEADLINE",
        linkUrl: `/bd/projects/${project.id}`,
        isRead: false,
        createdAt: now,
      });
    }

    // 2. Check BD Tasks
    const tasksToNotify = await prisma.bDTask.findMany({
      where: {
        dueDate: { lte: twoDaysFromNow },
        status: { not: "COMPLETED" },
        OR: [
          { deadlineNotifiedAt: null },
          { deadlineNotifiedAt: { lt: startOfToday } },
        ]
      },
      include: { assignee: true, project: true }
    });

    for (const task of tasksToNotify) {
      if (!task.assigneeId) continue;
      
      const isOverdue = task.dueDate && task.dueDate < now;
      const title = isOverdue ? "แจ้งเตือนงานเกินกำหนด" : "แจ้งเตือนงานใกล้ถึงกำหนด";
      const message = `งาน "${task.name}" ในโปรเจกต์ ${task.project.name} ${isOverdue ? "เลยกำหนดส่งแล้ว" : "จะถึงกำหนดส่งในเร็วๆ นี้"}`;

      notifications.push({
        userId: task.assigneeId,
        title,
        message,
        type: "BD_TASK_DEADLINE",
        linkUrl: `/bd/projects/${task.projectId}`,
        isRead: false,
        createdAt: now,
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    // Update deadlineNotifiedAt
    if (projectsToNotify.length > 0) {
      await prisma.bDProject.updateMany({
        where: { id: { in: projectsToNotify.map(p => p.id) } },
        data: { deadlineNotifiedAt: now }
      });
    }

    if (tasksToNotify.length > 0) {
      await prisma.bDTask.updateMany({
        where: { id: { in: tasksToNotify.map(t => t.id) } },
        data: { deadlineNotifiedAt: now }
      });
    }

    return NextResponse.json({ 
      message: `Sent ${notifications.length} deadline notifications`,
      projects: projectsToNotify.map(p => p.id),
      tasks: tasksToNotify.map(t => t.id)
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
