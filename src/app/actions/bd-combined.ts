'use server'

import { getBdWorkloadSummary } from './tickets';
import { getBDTeamOverview } from './bd-reports';
import prisma from "@/app/lib/db";

export type BdCombinedWorkload = {
  userId: string;
  name: string;
  tickets: {
    waiting: number;
    inProgress: number;
    completedToday: number;
    avgProgress: number;
  };
  projects: {
    inProgress: number;
    remaining: number;
    avgProgress: number;
  };
};

export async function getBdCombinedWorkload() {
  try {
    const [ticketsRes, reportsRes] = await Promise.all([
      getBdWorkloadSummary(),
      getBDTeamOverview()
    ]);

    if (!ticketsRes.success || !ticketsRes.data) {
      return { success: false, error: ticketsRes.error || 'Failed to fetch tickets workload' };
    }
    
    if (!reportsRes.success || !reportsRes.data) {
      return { success: false, error: reportsRes.error || 'Failed to fetch projects workload' };
    }

    const ticketsData = ticketsRes.data as any[];
    const projectsData = reportsRes.data.userStats as any[];

    // Extract all unique users from both lists
    const userMap = new Map<string, BdCombinedWorkload>();

    // 1. Map tickets data
    ticketsData.forEach(t => {
      userMap.set(t.id, {
        userId: t.id,
        name: t.name,
        tickets: {
          waiting: t.waiting || 0,
          inProgress: t.inProgress || 0,
          completedToday: t.completedToday || 0,
          avgProgress: t.averageProgress || 0,
        },
        projects: {
          inProgress: 0,
          remaining: 0,
          avgProgress: 0,
        }
      });
    });

    // 2. Map projects data
    projectsData.forEach(p => {
      if (userMap.has(p.userId)) {
        const existing = userMap.get(p.userId)!;
        existing.projects = {
          inProgress: p.inProgressTasks || 0,
          remaining: (p.pendingTasks || 0) + (p.blockedTasks || 0),
          avgProgress: p.completionPercentage || 0,
        };
      } else {
        userMap.set(p.userId, {
          userId: p.userId,
          name: p.fullName,
          tickets: { waiting: 0, inProgress: 0, completedToday: 0, avgProgress: 0 },
          projects: {
            inProgress: p.inProgressTasks || 0,
            remaining: (p.pendingTasks || 0) + (p.blockedTasks || 0),
            avgProgress: p.completionPercentage || 0,
          }
        });
      }
    });

    const combined = Array.from(userMap.values());
    
    // Sort by name
    combined.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate team averages
    let totalTicketProgress = 0;
    let totalProjectProgress = 0;
    let validTicketUsers = 0;
    let validProjectUsers = 0;
    
    combined.forEach(w => {
      // Only count users who actually have tickets or projects for a truer average, 
      // or just average across all users. Let's average across all to match original logic,
      // but maybe it's better. We'll stick to simple average across all users.
      totalTicketProgress += w.tickets.avgProgress;
      totalProjectProgress += w.projects.avgProgress;
    });
    
    const teamAverages = {
      avgTicketProgress: combined.length > 0 ? Math.round(totalTicketProgress / combined.length) : 0,
      avgProjectProgress: combined.length > 0 ? Math.round(totalProjectProgress / combined.length) : 0,
    };

    // Fetch identified issues (blocked tasks)
    const blockedTasksRaw = await prisma.bDTask.findMany({
      where: {
        blockedReason: { not: null },
        status: { notIn: ['COMPLETED', 'SKIPPED'] }
      },
      include: {
        assignee: { select: { fullName: true } },
        project: { select: { name: true } }
      }
    });

    const identifiedIssues = blockedTasksRaw.map(t => ({
      id: t.id,
      name: t.name,
      projectName: t.project?.name || 'Unknown Project',
      assigneeName: t.assignee?.fullName || 'Unassigned',
      blockedReason: t.blockedReason
    }));

    return { 
      success: true, 
      data: {
        userWorkloads: combined,
        teamAverages,
        identifiedIssues
      } 
    };
  } catch (error: any) {
    console.error("Error in getBdCombinedWorkload:", error);
    return { success: false, error: error.message };
  }
}
