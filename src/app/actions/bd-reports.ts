"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

export async function getBDReportData(targetUserId?: string, month?: number, year?: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { success: false, error: 'Unauthorized' };

    // RBAC Enforcement
    const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ'].includes(currentUser.role) || currentUser.role?.toLowerCase().includes('mgr') || currentUser.role?.toLowerCase().includes('manager');
    const isBDLead = currentUser.role === 'Business Development';
    
    let effectiveUserId = targetUserId || currentUser.id;
    if (!isExecutive && !isBDLead) {
      if (targetUserId && targetUserId !== currentUser.id) {
        return { success: false, error: 'Unauthorized to view other users\' reports' };
      }
      effectiveUserId = currentUser.id;
    }

    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Active Projects (owner = person, status IN_PROGRESS)
    const activeProjects = await prisma.bDProject.findMany({
      where: { ownerId: effectiveUserId, status: 'IN_PROGRESS' },
      include: { workType: true }
    });

    // Active Tasks (assignee = person, status NOT IN COMPLETED, SKIPPED)
    const activeTasksCount = await prisma.bDTask.count({
      where: {
        assigneeId: effectiveUserId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    });

    // Blocked Tasks
    const blockedTasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        blockedReason: { not: null }
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    // Completed this month
    const completedTasksThisMonth = await prisma.bDTask.count({
      where: {
        assigneeId: effectiveUserId,
        status: 'COMPLETED',
        completedAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Charts Data
    
    // 1. Tasks by Status
    const tasksByStatusAgg = await prisma.bDTask.groupBy({
      by: ['status'],
      where: { assigneeId: effectiveUserId },
      _count: { status: true }
    });

    // 2. Throughput per week (last 6 weeks)
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    
    const recentlyCompletedTasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        status: 'COMPLETED',
        completedAt: { gte: sixWeeksAgo }
      },
      select: { completedAt: true }
    });

    // 3. Projects by Work Type (Active)
    const workTypeCounts = activeProjects.reduce((acc: any, proj) => {
      const typeName = proj.workType?.name || 'Unknown';
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {});

    const targetUser = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { fullName: true }
    });

    return {
      success: true,
      data: {
        targetUser,
        kpi: {
          activeProjects: activeProjects.length,
          activeTasks: activeTasksCount,
          blockedTasks: blockedTasks.length,
          completedThisMonth: completedTasksThisMonth
        },
        blockedTasksList: blockedTasks.map(t => {
          const daysBlocked = t.blockedAt ? Math.floor((now.getTime() - t.blockedAt.getTime()) / (1000 * 3600 * 24)) : 0;
          return {
            id: t.id,
            name: t.name,
            projectName: t.project.name,
            blockedReason: t.blockedReason,
            waitingOn: t.waitingOn,
            daysBlocked
          };
        }),
        charts: {
          tasksByStatus: tasksByStatusAgg.map(t => ({ name: t.status, value: t._count.status })),
          throughputLast6Weeks: recentlyCompletedTasks, // We will group this in frontend
          projectsByWorkType: Object.entries(workTypeCounts).map(([name, count]) => ({ name, value: count }))
        }
      }
    };
  } catch (error) {
    console.error('Error fetching BD report:', error);
    return { success: false, error: 'Failed to fetch report data' };
  }
}

export async function getBDTeamOverview() {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date();
    const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ'].includes(currentUser.role) || currentUser.role?.toLowerCase().includes('mgr') || currentUser.role?.toLowerCase().includes('manager');
    const isBD = currentUser.role === 'Business Development';

    if (!isExecutive && !isBD) {
      return { success: false, error: 'Unauthorized' };
    }

    // Include users who have the BD role or have owned BD projects
    const bdProjectOwners = await prisma.bDProject.findMany({
      where: { ownerId: { not: null } },
      select: { ownerId: true },
      distinct: ['ownerId']
    });
    
    const ownerIds = bdProjectOwners.map(p => p.ownerId as string);

    const users = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { in: ['Business Development', 'SUPER_ADMIN', 'ผู้จัดการ'] } },
          { role: { contains: 'MGR' } },
          { id: { in: ownerIds } }
        ]
      },
      select: { id: true, fullName: true, role: true }
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const overview = await Promise.all(users.map(async u => {
      const activeProjects = await prisma.bDProject.count({ where: { ownerId: u.id, status: 'IN_PROGRESS' } });
      const activeTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, status: { in: ['PENDING', 'IN_PROGRESS'] } } });
      const blockedTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, blockedReason: { not: null } } });
      const completedThisMonth = await prisma.bDTask.count({
        where: { assigneeId: u.id, status: 'COMPLETED', completedAt: { gte: startOfMonth } }
      });

      return {
        userId: u.id,
        fullName: u.fullName,
        activeProjects,
        activeTasks,
        blockedTasks,
        completedThisMonth
      };
    }));

    return { success: true, data: overview };
  } catch (error) {
    console.error('Error fetching team overview:', error);
    return { success: false, error: 'Failed to fetch team overview' };
  }
}

export async function getBDTeamMembers() {
  try {
    const bdProjectOwners = await prisma.bDProject.findMany({
      where: { ownerId: { not: null } },
      select: { ownerId: true },
      distinct: ['ownerId']
    });
    
    const ownerIds = bdProjectOwners.map(p => p.ownerId as string);

    const members = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { in: ['Business Development', 'SUPER_ADMIN', 'ผู้จัดการ'] } },
          { role: { contains: 'MGR' } },
          { id: { in: ownerIds } }
        ]
      },
      select: { id: true, fullName: true, role: true }
    });

    return { success: true, data: members };
  } catch (error) {
    return { success: false, error: 'Failed to fetch team members' };
  }
}
