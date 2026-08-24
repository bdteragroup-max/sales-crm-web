import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";
import { sendPushToUser } from "@/app/lib/pushNotification";
import { pushLineMessage, bdDeadlineAlertMessage } from "@/app/lib/lineNotify";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.departmentLineConfig.findUnique({
      where: { department: "BD" }
    });
    const lineGroupId = config?.isActive ? config.lineGroupId : null;
    const lineMessages: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfToday = new Date(today);
    
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);


    const pushPromises: any[] = [];

    const now = new Date();

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

      pushPromises.push(
        sendPushToUser(project.ownerId, {
          title,
          body: message,
          category: "BD_PROJECT_DEADLINE",
          url: `/bd/projects/${project.id}`
        })
      );

      if (lineGroupId && isOverdue) {
        lineMessages.push(bdDeadlineAlertMessage({
          title: `[Project] ${project.name}`,
          targetDate: project.deadline
        }));
      }
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

      pushPromises.push(
        sendPushToUser(task.assigneeId, {
          title,
          body: message,
          category: "BD_TASK_DEADLINE",
          url: `/bd/projects/${task.projectId}`
        })
      );

      if (lineGroupId && isOverdue) {
        lineMessages.push(bdDeadlineAlertMessage({
          title: `[Task] ${task.name} (ใน ${task.project.name})`,
          targetDate: task.dueDate
        }));
      }
    }

    // Insert notifications
    if (pushPromises.length > 0) {
      await Promise.all(pushPromises);
    }

    // Send LINE messages
    if (lineGroupId && lineMessages.length > 0) {
      await pushLineMessage(lineGroupId, lineMessages, 'crm');
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
      message: `Sent ${pushPromises.length} deadline notifications and ${lineMessages.length} LINE alerts`,
      projects: projectsToNotify.map(p => p.id),
      tasks: tasksToNotify.map(t => t.id)
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

