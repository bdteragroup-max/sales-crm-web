"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

export interface UnifiedWorkItem {
  id: string;
  source: 'PROJECT' | 'TASK' | 'TICKET';
  title: string;
  parentName?: string;
  status: string;
  urgency: string;
  deadline: Date | null;
  createdAt: Date;
  linkUrl: string;
}

export async function getPersonalWorkData(): Promise<{ success: boolean; data?: UnifiedWorkItem[]; error?: string }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id;

    // Fetch unresolved tasks
    const tasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" }
      },
      include: {
        project: { select: { name: true, urgency: true } }
      }
    });

    // Fetch unresolved projects directly owned by the user (where they are the owner)
    const projects = await prisma.bDProject.findMany({
      where: {
        ownerId: userId,
        status: { not: "COMPLETED" }
      }
    });

    // Fetch unresolved tickets
    const tickets = await prisma.supportTicket.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ["RESOLVED", "CLOSED"] }
      }
    });

    const unifiedList: UnifiedWorkItem[] = [];

    // Map Projects
    for (const proj of projects) {
      unifiedList.push({
        id: proj.id,
        source: 'PROJECT',
        title: proj.name,
        parentName: 'Project Owner',
        status: proj.status,
        urgency: proj.urgency,
        deadline: proj.deadline,
        createdAt: proj.createdAt,
        linkUrl: `/bd/projects/${proj.id}`
      });
    }

    // Map Tasks
    for (const task of tasks) {
      unifiedList.push({
        id: task.id,
        source: 'TASK',
        title: task.name,
        parentName: task.project.name,
        status: task.status,
        urgency: task.project.urgency, // Using project urgency
        deadline: task.dueDate,
        createdAt: task.createdAt,
        linkUrl: `/bd/projects/${task.projectId}` // Since BD tasks are managed within projects
      });
    }

    // Map Tickets
    for (const ticket of tickets) {
      unifiedList.push({
        id: ticket.id,
        source: 'TICKET',
        title: ticket.title,
        parentName: ticket.category,
        status: ticket.status,
        urgency: ticket.urgency,
        deadline: null, // Tickets usually don't have hard deadlines, we sort by urgency
        createdAt: ticket.createdAt,
        linkUrl: `/bd/tickets/${ticket.id}`
      });
    }

    // Sorting Logic:
    // 1. Overdue Tasks
    // 2. High Urgency
    // 3. Nearest Deadline
    // 4. Creation Date (Oldest first)

    const now = new Date();

    unifiedList.sort((a, b) => {
      // 1. Check for overdue
      const aOverdue = a.deadline && a.deadline < now;
      const bOverdue = b.deadline && b.deadline < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. Urgency sorting
      const urgencyScore = (u: string) => {
        const uUpper = (u || '').toUpperCase();
        if (uUpper.includes('HIGH') || uUpper.includes('ด่วนมาก') || uUpper.includes('CRITICAL')) return 3;
        if (uUpper.includes('MEDIUM') || uUpper.includes('ด่วน')) return 2;
        return 1;
      };

      const aUrgency = urgencyScore(a.urgency);
      const bUrgency = urgencyScore(b.urgency);
      
      if (aUrgency !== bUrgency) {
        return bUrgency - aUrgency; // Higher score first
      }

      // 3. Nearest Deadline
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      if (a.deadline && !b.deadline) return -1; // Items with deadlines get priority
      if (!a.deadline && b.deadline) return 1;

      // 4. Oldest first
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return { success: true, data: unifiedList };

  } catch (error: any) {
    console.error("Error in getPersonalWorkData:", error);
    return { success: false, error: error.message || "Failed to fetch work data" };
  }
}
