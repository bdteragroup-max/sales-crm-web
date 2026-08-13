"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

export async function getBDReportData(targetUserId?: string, month?: number, year?: number, filterOptions?: { dateType: 'ASSIGNED' | 'COMPLETED', startDate?: Date, endDate?: Date }) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { success: false, error: 'Unauthorized' };

    // RBAC Enforcement
    const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ'].includes(currentUser.role) || currentUser.role?.toLowerCase().includes('mgr') || currentUser.role?.toLowerCase().includes('manager');
    const isBDLead = ['Business Development'].includes(currentUser.role);
    const isBDIntern = currentUser.role === 'BD Intern';
    const isBD = isBDLead || isBDIntern;
    
    let effectiveUserId = targetUserId || currentUser.id;
    if (!isExecutive && !isBD) {
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

    let projectBaseFilter: any = {};
    let taskBaseFilter: any = {};
    let dueDateFilter: any = undefined;

    if (filterOptions?.startDate && filterOptions?.endDate) {
      const s = new Date(filterOptions.startDate);
      const e = new Date(filterOptions.endDate);
      e.setHours(23, 59, 59, 999);
      if (filterOptions.dateType === 'ASSIGNED') {
        projectBaseFilter = { createdAt: { gte: s, lte: e } };
        taskBaseFilter = { createdAt: { gte: s, lte: e } };
        dueDateFilter = undefined;
      } else if (filterOptions.dateType === 'COMPLETED') {
        // Use dueDate to filter tasks by their due date, not when they were actually completed
        projectBaseFilter = {}; 
        taskBaseFilter = { dueDate: { gte: s, lte: e } };
        dueDateFilter = { gte: s, lte: e };
      }
    }

    // Active Projects (owner = person OR member = person, status IN_PROGRESS)
    const activeProjects = await prisma.bDProject.findMany({
      where: { 
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } }
        ],
        status: 'IN_PROGRESS', 
        ...projectBaseFilter 
      },
      include: { workType: true }
    });

    // Taskless projects: major projects with no tasks/sub-projects that should still count as work items
    const tasklessProjects = await prisma.bDProject.findMany({
      where: {
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } },
          { ownerId: null, requesterId: effectiveUserId }
        ],
        tasks: { none: {} },
        subProjects: { none: {} },
        ...projectBaseFilter
      },
      include: { workType: true }
    });

    const tasklessActive = tasklessProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PENDING_REVIEW');
    const tasklessCompleted = tasklessProjects.filter(p => p.status === 'COMPLETED');

    // Active Tasks (assignee = person, status NOT IN COMPLETED, SKIPPED)
    const activeTasksCount = await prisma.bDTask.count({
      where: {
        assigneeId: effectiveUserId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        ...taskBaseFilter
      }
    });

    // Blocked Tasks
    const blockedTasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        blockedReason: { not: null },
        ...taskBaseFilter
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    // Completed this month / range (filtered by dueDate)
    const completedTasksThisMonth = await prisma.bDTask.count({
      where: {
        assigneeId: effectiveUserId,
        status: 'COMPLETED',
        ...(dueDateFilter ? { dueDate: dueDateFilter } : taskBaseFilter)
      }
    });

    // Completed taskless projects for this period
    const completedTasklessThisMonth = await prisma.bDProject.count({
      where: {
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } },
          { ownerId: null, requesterId: effectiveUserId }
        ],
        status: 'COMPLETED',
        tasks: { none: {} },
        subProjects: { none: {} },
        ...(dueDateFilter ? { deadline: dueDateFilter } : projectBaseFilter)
      }
    });

    // Charts Data
    
    // 1. Tasks by Status (include taskless projects as virtual items)
    const tasksByStatusAgg = await prisma.bDTask.groupBy({
      by: ['status'],
      where: { assigneeId: effectiveUserId, ...taskBaseFilter },
      _count: { status: true }
    });

    // Merge taskless project statuses into tasksByStatus
    const statusMap: Record<string, number> = {};
    tasksByStatusAgg.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + t._count.status; });
    tasklessProjects.forEach(p => {
      const st = p.status === 'PENDING_REVIEW' ? 'PENDING' : p.status;
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    // 2. Trend Data (last 6 months or custom range)
    let trendStartDate = new Date();
    trendStartDate.setMonth(trendStartDate.getMonth() - 5);
    trendStartDate.setDate(1);
    trendStartDate.setHours(0, 0, 0, 0);
    
    let trendEndDate = new Date();
    
    if (filterOptions?.startDate && filterOptions?.endDate) {
      trendStartDate = new Date(filterOptions.startDate);
      trendEndDate = new Date(filterOptions.endDate);
      trendEndDate.setHours(23, 59, 59, 999);
    }

    const recentlyCompletedTasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        status: 'COMPLETED',
        completedAt: { gte: trendStartDate, lte: trendEndDate }
      },
      select: { completedAt: true }
    });

    // Also fetch completed taskless projects for trend data
    const recentlyCompletedTasklessProjects = await prisma.bDProject.findMany({
      where: {
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } },
          { ownerId: null, requesterId: effectiveUserId }
        ],
        status: 'COMPLETED',
        tasks: { none: {} },
        subProjects: { none: {} },
        completedAt: { gte: trendStartDate, lte: trendEndDate }
      },
      select: { completedAt: true }
    });

    // Merge taskless project completions into the trend completed list
    const allRecentlyCompleted = [
      ...recentlyCompletedTasks,
      ...recentlyCompletedTasklessProjects
    ];

    const recentlyAssignedTasks = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        createdAt: { gte: trendStartDate, lte: trendEndDate }
      },
      select: { createdAt: true }
    });

    // Also fetch taskless projects created in trend range
    const recentlyCreatedTasklessProjects = await prisma.bDProject.findMany({
      where: {
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } },
          { ownerId: null, requesterId: effectiveUserId }
        ],
        tasks: { none: {} },
        subProjects: { none: {} },
        createdAt: { gte: trendStartDate, lte: trendEndDate }
      },
      select: { createdAt: true }
    });

    const allRecentlyAssigned = [
      ...recentlyAssignedTasks,
      ...recentlyCreatedTasklessProjects
    ];

    // 3. Projects by Work Type (Active) - for existing pie chart
    const workTypeCounts = activeProjects.reduce((acc: any, proj) => {
      const typeName = proj.workType?.name || 'Unknown';
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {});

    // 4. Skills & Competencies (Completed tasks by Work Type) - for Radar Chart
    const completedTasksWithWorkType = await prisma.bDTask.findMany({
      where: {
        assigneeId: effectiveUserId,
        status: 'COMPLETED',
        ...(dueDateFilter ? { dueDate: dueDateFilter } : taskBaseFilter)
      },
      include: {
        project: { include: { workType: true } }
      }
    });

    const radarWorkTypeCounts = completedTasksWithWorkType.reduce((acc: any, task) => {
      const typeName = task.project?.workType?.name || 'Unknown';
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {});

    // Also count completed taskless projects in radar competencies
    const completedTasklessForRadar = await prisma.bDProject.findMany({
      where: {
        OR: [
          { ownerId: effectiveUserId },
          { members: { some: { id: effectiveUserId } } },
          { ownerId: null, requesterId: effectiveUserId }
        ],
        status: 'COMPLETED',
        tasks: { none: {} },
        subProjects: { none: {} },
        ...(dueDateFilter ? { deadline: dueDateFilter } : projectBaseFilter)
      },
      include: { workType: true }
    });
    completedTasklessForRadar.forEach(p => {
      const typeName = p.workType?.name || 'Unknown';
      radarWorkTypeCounts[typeName] = (radarWorkTypeCounts[typeName] || 0) + 1;
    });

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
          activeTasks: activeTasksCount + tasklessActive.length,
          blockedTasks: blockedTasks.length,
          completedThisMonth: completedTasksThisMonth + completedTasklessThisMonth
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
          tasksByStatus: Object.entries(statusMap).map(([status, count]) => {
            let label = status;
            if (status === 'COMPLETED') label = 'เสร็จสิ้น';
            if (status === 'IN_PROGRESS') label = 'กำลังดำเนินการ';
            if (status === 'PENDING') label = 'รอดำเนินการ';
            if (status === 'ON_HOLD') label = 'ระงับชั่วคราว';
            return { name: label, value: count };
          }),
          trendData: {
            completed: allRecentlyCompleted,
            assigned: allRecentlyAssigned,
            trendStartDate,
            trendEndDate
          },
          projectsByWorkType: Object.entries(workTypeCounts).map(([name, count]) => ({ name, value: count })),
          competencies: Object.entries(radarWorkTypeCounts).map(([name, count]) => ({ subject: name, A: count, fullMark: 100 }))
        }
      }
    };
  } catch (error) {
    console.error('Error fetching BD report:', error);
    return { success: false, error: 'Failed to fetch report data' };
  }
}

export async function getBDTeamOverview(filterOptions?: { dateType: 'ASSIGNED' | 'COMPLETED', startDate?: Date, endDate?: Date }) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date();
    const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ'].includes(currentUser.role) || currentUser.role?.toLowerCase().includes('mgr') || currentUser.role?.toLowerCase().includes('manager');
    const isBD = ['Business Development', 'BD Intern'].includes(currentUser.role);

    if (!isExecutive && !isBD) {
      return { success: false, error: 'Unauthorized' };
    }

    // Include users who have the BD role or have owned/member BD projects
    const bdProjectUsers = await prisma.bDProject.findMany({
      where: { OR: [{ ownerId: { not: null } }, { members: { some: {} } }] },
      select: { ownerId: true, members: { select: { id: true } } },
    });
    
    const projectUserIds = new Set<string>();
    bdProjectUsers.forEach(p => {
      if (p.ownerId) projectUserIds.add(p.ownerId);
      p.members.forEach(m => projectUserIds.add(m.id));
    });
    
    const ownerIds = Array.from(projectUserIds);

    const users = await prisma.user.findMany({
      where: { 
        OR: [
          { role: { in: ['Business Development', 'BD Intern'] } },
          { id: { in: ownerIds } }
        ]
      },
      select: { id: true, fullName: true, role: true }
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let projectBaseFilter: any = {};
    let taskBaseFilter: any = {};
    let dueDateFilter: any = undefined;

    if (filterOptions?.startDate && filterOptions?.endDate) {
      const s = new Date(filterOptions.startDate);
      const e = new Date(filterOptions.endDate);
      e.setHours(23, 59, 59, 999);
      if (filterOptions.dateType === 'ASSIGNED') {
        projectBaseFilter = { createdAt: { gte: s, lte: e } };
        taskBaseFilter = { createdAt: { gte: s, lte: e } };
        dueDateFilter = undefined;
      } else if (filterOptions.dateType === 'COMPLETED') {
        // Use dueDate to filter tasks by their due date
        projectBaseFilter = {}; 
        taskBaseFilter = { dueDate: { gte: s, lte: e } };
        dueDateFilter = { gte: s, lte: e };
      }
    }

    const overview = await Promise.all(users.map(async u => {
      const userProjectFilter = {
        OR: [
          { ownerId: u.id },
          { members: { some: { id: u.id } } },
          { ownerId: null, requesterId: u.id }
        ]
      };

      const activeProjects = await prisma.bDProject.count({ 
        where: { 
          status: 'IN_PROGRESS',
          ...projectBaseFilter,
          ...userProjectFilter
        } 
      });

      // Taskless projects: major projects with no tasks/sub-projects
      const tasklessProjectsForUser = await prisma.bDProject.findMany({
        where: {
          ...userProjectFilter,
          tasks: { none: {} },
          subProjects: { none: {} },
          ...projectBaseFilter
        },
        select: { status: true }
      });
      const tasklessInProgress = tasklessProjectsForUser.filter(p => p.status === 'IN_PROGRESS').length;
      const tasklessPending = tasklessProjectsForUser.filter(p => p.status === 'PENDING_REVIEW').length;
      const tasklessCompletedCount = tasklessProjectsForUser.filter(p => p.status === 'COMPLETED').length;

      // If filtering by COMPLETED (dueDate), don't apply dueDate filter to active/blocked tasks since they may not have a due date
      const pendingFilter = filterOptions?.dateType === 'COMPLETED' ? {} : taskBaseFilter;
      
      const activeTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, status: { in: ['PENDING', 'IN_PROGRESS'] }, ...pendingFilter } });
      const inProgressTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, status: 'IN_PROGRESS', ...pendingFilter } });
      const pendingTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, status: 'PENDING', ...pendingFilter } });
      const blockedTasks = await prisma.bDTask.count({ where: { assigneeId: u.id, blockedReason: { not: null }, ...pendingFilter } });
      const completedThisMonth = await prisma.bDTask.count({
        where: { 
          assigneeId: u.id, 
          status: 'COMPLETED', 
          ...(dueDateFilter ? { dueDate: dueDateFilter } : taskBaseFilter)
        }
      });

      // Completed taskless projects for this period
      const completedTasklessThisMonth = await prisma.bDProject.count({
        where: {
          ...userProjectFilter,
          status: 'COMPLETED',
          tasks: { none: {} },
          subProjects: { none: {} },
          ...(dueDateFilter ? { deadline: dueDateFilter } : projectBaseFilter)
        }
      });

      const completedProjectsThisMonth = await prisma.bDProject.count({
        where: {
          status: 'COMPLETED',
          ...(dueDateFilter ? { deadline: dueDateFilter } : projectBaseFilter),
          ...userProjectFilter
        }
      });
      
      const totalAssigned = await prisma.bDTask.count({ where: { assigneeId: u.id, ...taskBaseFilter }});
      const completedCount = await prisma.bDTask.count({ where: { assigneeId: u.id, status: 'COMPLETED', ...taskBaseFilter }});
      const blockedCount = await prisma.bDTask.count({ where: { assigneeId: u.id, blockedReason: { not: null }, ...taskBaseFilter }});

      // Include taskless projects in totals for accurate percentages
      const totalTasklessForUser = tasklessProjectsForUser.length;
      const totalItems = totalAssigned + totalTasklessForUser;
      const completedItems = completedCount + tasklessCompletedCount;
      
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const blockedPercentage = totalItems > 0 ? Math.round((blockedCount / totalItems) * 100) : 0;

      return {
        userId: u.id,
        fullName: u.fullName,
        activeProjects,
        completedProjectsThisMonth,
        activeTasks: activeTasks + tasklessInProgress + tasklessPending,
        inProgressTasks: inProgressTasks + tasklessInProgress,
        pendingTasks: pendingTasks + tasklessPending,
        blockedTasks,
        completedThisMonth: completedThisMonth + completedTasklessThisMonth,
        completionPercentage,
        blockedPercentage
      };
    }));

    // Team task status (include taskless projects)
    const teamTaskStatusRaw = await prisma.bDTask.groupBy({
      by: ['status'],
      _count: true,
      where: { ...taskBaseFilter }
    });

    // Also count taskless projects by status for the team pie chart
    const allTasklessProjects = await prisma.bDProject.findMany({
      where: {
        tasks: { none: {} },
        subProjects: { none: {} },
        ...projectBaseFilter
      },
      select: { status: true }
    });

    const teamStatusMap: Record<string, number> = {};
    teamTaskStatusRaw.forEach(s => { teamStatusMap[s.status] = (teamStatusMap[s.status] || 0) + s._count; });
    allTasklessProjects.forEach(p => {
      const st = p.status === 'PENDING_REVIEW' ? 'PENDING' : p.status;
      teamStatusMap[st] = (teamStatusMap[st] || 0) + 1;
    });
    
    const teamTaskStatus = Object.entries(teamStatusMap).map(([status, count]) => ({
      name: status === 'COMPLETED' ? 'เสร็จสิ้น' : status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : status === 'PENDING' ? 'รอดำเนินการ' : status,
      value: count,
      fill: status === 'COMPLETED' ? '#10b981' : status === 'IN_PROGRESS' ? '#3b82f6' : status === 'PENDING' ? '#f59e0b' : '#ef4444'
    }));

    // Gantt Projects (In Progress or Pending)
    const activeProjectsList = await prisma.bDProject.findMany({
      where: { status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] }, ...projectBaseFilter },
      select: { id: true, name: true, intakeDate: true, createdAt: true, deadline: true, color: true }
    });
    const ganttProjects = activeProjectsList.map(p => ({
      id: p.id,
      name: p.name,
      startDate: p.intakeDate || p.createdAt,
      endDate: p.deadline || new Date(),
      color: p.color || '#3b82f6'
    }));

    // Project Progress
    const projectProgressRaw = await prisma.bDProject.findMany({
      where: { status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] }, ...projectBaseFilter },
      include: {
        tasks: { select: { status: true } },
        subProjects: { select: { status: true } }
      }
    });

    const projectProgress = projectProgressRaw.map(p => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter(t => t.status === 'COMPLETED').length;
      const totalSub = p.subProjects.length;
      const completedSub = p.subProjects.filter(s => s.status === 'COMPLETED').length;
      
      const totalItems = totalTasks + totalSub;
      const completedItems = completedTasks + completedSub;
      let progress: number;
      if (totalItems > 0) {
        progress = Math.round((completedItems / totalItems) * 100);
      } else {
        // Major projects with no tasks/sub-projects: count the project itself
        if (p.status === 'COMPLETED') progress = 100;
        else if (p.status === 'IN_PROGRESS') progress = 50;
        else progress = 0;
      }

      return {
        id: p.id,
        name: p.name,
        progress,
        totalTasks,
        completedTasks,
        totalSubProjects: totalSub,
        completedSubProjects: completedSub,
        status: p.status
      };
    });

    return { success: true, data: { userStats: overview, teamTaskStatus, ganttProjects, projectProgress } };
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
          { role: { in: ['Business Development', 'BD Intern', 'SUPER_ADMIN', 'ผู้จัดการ'] } },
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
