"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { sendPushToUser } from "@/app/lib/pushNotification";

// 1. Core ticket creation logic (no session required)
// Used by both the server action and the external API route
export async function createTicketCore(data: {
  reporterId: string | null;
  reporterName?: string;
  reporterEmail?: string;
  title: string;
  description: string;
  category?: string;
  urgency?: string;
  attachments?: string[];
  sourceModule?: string;
}) {
  // Generate ticket number: TK-YYYYMMDD-NNN
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  // Find the latest ticket for today to increment the number
  const latestTicket = await prisma.supportTicket.findFirst({
    where: {
      ticketNumber: {
        startsWith: `TK-${dateStr}-`,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
  });

  let nextNum = 1;
  if (latestTicket) {
    const parts = latestTicket.ticketNumber.split("-");
    if (parts.length === 3) {
      nextNum = parseInt(parts[2], 10) + 1;
    }
  }
  const ticketNumber = `TK-${dateStr}-${String(nextNum).padStart(3, "0")}`;

  const urgency = data.urgency || "MEDIUM";

  const validCategories = ['BUG', 'FEATURE_REQUEST', 'QUESTION', 'ACCOUNT_ACCESS', 'OTHER'];
  let category = data.category || 'OTHER';
  if (!validCategories.includes(category)) {
    category = 'OTHER';
  }

  // Create ticket and initial log
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      title: data.title,
      description: data.description,
      category,
      urgency,
      attachments: data.attachments || [],
      reporterId: data.reporterId,
      reporterName: data.reporterId ? null : data.reporterName,
      reporterEmail: data.reporterId ? null : data.reporterEmail,
      sourceModule: data.sourceModule || 'general',
      status: "SUBMITTED",
      logs: {
        create: {
          userId: data.reporterId, // if null, it creates an anonymous log
          action: "สร้างรายการแจ้งปัญหา",
          details: `ระดับความสำคัญ: ${urgency}`,
        },
      },
    },
  });

  // Notify BD users
  const bdUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        in: ['Business Development', 'BD Intern'],
      },
    },
    select: { id: true },
  });

  if (bdUsers.length > 0) {
    await Promise.all(
      bdUsers.map((bdUser) =>
        sendPushToUser(bdUser.id, {
          title: "แจ้งปัญหาใหม่",
          body: `Ticket: ${ticketNumber} - ${data.title} (${urgency})`,
          url: `/bd/tickets/${ticket.id}`,
          category: "SUPPORT_TICKET",
        })
      )
    );
  }

  // --- Real-time LINE Alert for Urgent Tickets ---
  if (urgency === "HIGH" || urgency === "CRITICAL") {
    try {
      const config = await prisma.departmentLineConfig.findUnique({
        where: { department: "BD" }
      });
      if (config && config.isActive && config.lineGroupId) {
        const { pushLineMessage, bdUrgentTicketMessage } = await import("@/app/lib/lineNotify");
        let finalReporterName = data.reporterName || "ระบบ / ไม่ทราบชื่อ";
        if (data.reporterId && !data.reporterName) {
          const rUser = await prisma.user.findUnique({ where: { id: data.reporterId }, select: { fullName: true } });
          if (rUser) finalReporterName = rUser.fullName;
        }

        const msg = bdUrgentTicketMessage(ticket, finalReporterName);
        await pushLineMessage(config.lineGroupId, [msg], 'crm');
      }
    } catch (err) {
      console.error("Failed to send real-time ticket alert", err);
    }
  }

  revalidatePath("/support/tickets");
  revalidatePath("/bd/tickets");

  return ticket;
}

// 1b. Server action wrapper (with session) — used by /support/tickets UI
export async function createTicket(data: {
  title: string;
  description: string;
  category?: string;
  urgency: string;
  attachments?: string[];
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const ticket = await createTicketCore({
      reporterId: user.id,
      ...data,
      sourceModule: 'crm',
    });

    return { success: true, data: ticket };
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return { success: false, error: error.message };
  }
}


// 2. Get tickets for the current user (Reporter view)
export async function getMyTickets() {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const whereClause = user.role === 'SUPER_ADMIN' ? {} : { reporterId: user.id };

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { fullName: true, id: true },
        },
        reporter: {
          select: { fullName: true, id: true, role: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: tickets };
  } catch (error: any) {
    console.error("Error fetching my tickets:", error);
    return { success: false, error: error.message };
  }
}

// 3. Get all tickets (BD / Admin view)
export async function getAllTickets() {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tickets = await prisma.supportTicket.findMany({
      include: {
        reporter: { select: { fullName: true, role: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: tickets };
  } catch (error: any) {
    console.error("Error fetching all tickets:", error);
    return { success: false, error: error.message };
  }
}

// 4. Get a single ticket by ID (Full details)
export async function getTicketById(id: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, fullName: true, role: true, email: true } },
        assignee: { select: { id: true, fullName: true } },
        logs: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: "asc" },
        },
        comments: {
          include: { user: { select: { fullName: true, role: true, id: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) return { success: false, error: "Ticket not found" };

    // RBAC: Only reporter, assignee, BD, or Admin can view
    const isBD = user.role.includes("Business Development") || user.role === "BD Intern";
    const isAdmin = ['SUPER_ADMIN', 'ผู้จัดการ', 'admin'].includes(user.role);
    if (ticket.reporterId !== user.id && ticket.assigneeId !== user.id && !isBD && !isAdmin) {
      return { success: false, error: "Unauthorized to view this ticket" };
    }

    return { success: true, data: ticket };
  } catch (error: any) {
    console.error("Error fetching ticket:", error);
    return { success: false, error: error.message };
  }
}

// 5. BD accepts a ticket
export async function acceptTicket(ticketId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!existing) return { success: false, error: "Ticket not found" };

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assigneeId: user.id,
        status: "ACKNOWLEDGED",
        logs: {
          create: {
            userId: user.id,
            action: "รับงาน",
            details: "เปลี่ยนสถานะเป็น Acknowledged",
          },
        },
      },
    });

    // Notify reporter
    if (existing.reporterId) {
      await sendPushToUser(existing.reporterId, {
        title: "ปัญหาของคุณได้รับการรับทราบแล้ว",
        body: `ทีมงานรับเรื่อง ${existing.ticketNumber} ของคุณแล้ว`,
        url: `/support/tickets/${existing.id}`,
        category: "SUPPORT_TICKET",
      });
    }

    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);
    revalidatePath("/bd/tickets");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error accepting ticket:", error);
    return { success: false, error: error.message };
  }
}

// 6. Update Resolution Plan & Progress
export async function updateResolutionPlan(ticketId: string, resolutionPlan: string, progressPercent: number) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!existing) return { success: false, error: "Ticket not found" };

    const isNewPlan = existing.resolutionPlan !== resolutionPlan;
    const isNewProgress = existing.progressPercent !== progressPercent;

    let details = [];
    if (isNewPlan) details.push("แผนการแก้ไข");
    if (isNewProgress) details.push(`ความคืบหน้าเป็น ${progressPercent}%`);

    if (details.length === 0) return { success: true, data: existing };

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        resolutionPlan,
        progressPercent,
        status: progressPercent === 100 ? "RESOLVED" : "IN_PROGRESS",
        resolvedAt: progressPercent === 100 ? new Date() : null,
        logs: {
          create: {
            userId: user.id,
            action: "อัปเดตงาน",
            details: `อัปเดต: ${details.join(", ")}`,
          },
        },
      },
    });

    // Notify reporter
    if (existing.reporterId) {
      await sendPushToUser(existing.reporterId, {
        title: "อัปเดตความคืบหน้าปัญหา",
        body: `ปัญหา ${existing.ticketNumber} มีการอัปเดตความคืบหน้า: ${progressPercent}%`,
        url: `/support/tickets/${existing.id}`,
        category: "SUPPORT_TICKET",
      });
    }

    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating ticket plan:", error);
    return { success: false, error: error.message };
  }
}

// 7. Resolve Ticket
export async function resolveTicket(ticketId: string) {
  return updateResolutionPlan(ticketId, "ดำเนินการเสร็จสิ้น (ปิดงาน)", 100);
}

// 8. Add a comment
export async function addComment(ticketId: string, message: string, attachments: string[] = []) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!existing) return { success: false, error: "Ticket not found" };

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId,
        userId: user.id,
        message,
        attachments,
      },
      include: {
        user: { select: { fullName: true, role: true, id: true } }
      }
    });

    // Notify the other party
    const isReporter = user.id === existing.reporterId;
    let targetUserId = isReporter ? existing.assigneeId : existing.reporterId;

    if (targetUserId) {
      await sendPushToUser(targetUserId, {
        title: "ความคิดเห็นใหม่ใน Ticket",
        body: `มีความคิดเห็นใหม่ใน ${existing.ticketNumber}: "${message.substring(0, 30)}..."`,
        url: isReporter ? `/bd/tickets/${ticketId}` : `/support/tickets/${ticketId}`,
        category: "SUPPORT_TICKET",
      });
    } else if (isReporter && !existing.assigneeId) {
      // If reporter comments but no one has accepted the ticket yet, notify all BD users
      const bdUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            in: ['Business Development', 'BD Intern'],
          },
        },
        select: { id: true },
      });

      if (bdUsers.length > 0) {
        await Promise.all(
          bdUsers.map((bdUser) =>
            sendPushToUser(bdUser.id, {
              title: "ความคิดเห็นใหม่ใน Ticket (ยังไม่มีผู้รับผิดชอบ)",
              body: `มีความคิดเห็นใหม่ใน ${existing.ticketNumber}: "${message.substring(0, 30)}..."`,
              url: `/bd/tickets/${ticketId}`,
              category: "SUPPORT_TICKET",
            })
          )
        );
      }
    }

    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true, data: comment };
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return { success: false, error: error.message };
  }
}

// 9. Admin Reassign Ticket
export async function reassignTicket(ticketId: string, newAssigneeId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isAdmin = ['SUPER_ADMIN', 'ผู้จัดการ', 'admin'].includes(user.role);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized to reassign tickets" };
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!existing) return { success: false, error: "Ticket not found" };

    const newAssignee = await prisma.user.findUnique({ where: { id: newAssigneeId } });
    if (!newAssignee) return { success: false, error: "New assignee not found" };

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assigneeId: newAssigneeId,
        logs: {
          create: {
            userId: user.id,
            action: "เปลี่ยนผู้รับผิดชอบ",
            details: `ผู้ดูแลระบบมอบหมายให้ ${newAssignee.fullName}`,
          },
        },
      },
    });

    // Notify new assignee
    await sendPushToUser(newAssigneeId, {
      title: "คุณได้รับมอบหมายปัญหาใหม่",
      body: `ผู้ดูแลระบบมอบหมาย Ticket ${existing.ticketNumber} ให้คุณ`,
      url: `/bd/tickets/${existing.id}`,
      category: "SUPPORT_TICKET",
    });

    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);
    revalidatePath("/bd/tickets");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error reassigning ticket:", error);
    return { success: false, error: error.message };
  }
}

// 10. Dashboard Stats
export async function getTicketStats() {
  try {
    const total = await prisma.supportTicket.count();
    const newTickets = await prisma.supportTicket.count({ where: { status: "SUBMITTED" } });
    const inProgress = await prisma.supportTicket.count({ where: { status: { in: ["ACKNOWLEDGED", "IN_PROGRESS"] } } });
    const resolved = await prisma.supportTicket.count({ where: { status: "RESOLVED" } });

    const resolvedTickets = await prisma.supportTicket.findMany({
      where: { status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    let avgHours = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((acc, t) => acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0);
      avgHours = (totalMs / resolvedTickets.length) / (1000 * 60 * 60);
    }

    return {
      success: true,
      data: {
        total,
        new: newTickets,
        inProgress,
        resolved,
        avgResolutionHours: avgHours.toFixed(1)
      }
    };
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return { success: false, error: error.message };
  }
}

// 11. BD TV Display Data & Reports Monthly Workload
export async function getBdWorkloadSummary(filterOptions?: { startDate?: Date, endDate?: Date }) {
  try {
    // 1. Verify user role instead of token
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isExecutive = ['SUPER_ADMIN', 'ผู้จัดการ', 'Admin'].includes(user.role) || user.role?.toLowerCase().includes('mgr') || user.role?.toLowerCase().includes('manager');
    const isBD = user.role?.includes('Business Development') || user.role === 'BD Intern';
    if (!isBD && !isExecutive) {
      return { success: false, error: "Unauthorized role for TV dashboard / reports" };
    }

    // 2. Fetch all users involved in BD (role OR project members/owners)
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

    const bdUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['Business Development', 'BD Intern'] } },
          { id: { in: ownerIds } }
        ]
      },
      select: {
        id: true,
        fullName: true,
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // 3. Date boundary calculations for monthly and today
    const now = new Date();
    let monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    let monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    if (filterOptions?.startDate && filterOptions?.endDate) {
      monthStart = new Date(filterOptions.startDate);
      monthStart.setHours(0, 0, 0, 0);
      monthEnd = new Date(filterOptions.endDate);
      monthEnd.setHours(23, 59, 59, 999);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 4. Fetch tickets: all active, resolved today, and tickets in selected month/period
    const tickets = await prisma.supportTicket.findMany({
      where: {
        assigneeId: {
          in: bdUsers.map(u => u.id)
        },
        OR: [
          { status: { not: "RESOLVED" } },
          {
            status: "RESOLVED",
            resolvedAt: {
              gte: today
            }
          },
          {
            status: "RESOLVED",
            resolvedAt: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        ]
      },
      select: {
        id: true,
        assigneeId: true,
        status: true,
        progressPercent: true,
        resolvedAt: true,
        createdAt: true
      }
    });

    // Also fetch unassigned tickets for accurate team-wide ticket counts
    const unassignedTickets = await prisma.supportTicket.findMany({
      where: {
        assigneeId: null,
        OR: [
          { status: { not: "RESOLVED" } },
          { createdAt: { gte: monthStart, lte: monthEnd } }
        ]
      },
      select: { id: true, status: true, createdAt: true }
    });
    const unassignedWaiting = unassignedTickets.filter(t => t.status === "SUBMITTED" || t.status === "ACKNOWLEDGED").length;
    const unassignedAssignedThisMonth = unassignedTickets.filter(t => t.createdAt && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) <= monthEnd).length;

    // 5. Calculate stats per BD including monthly metrics
    const summary = bdUsers.map(bd => {
      const bdTickets = tickets.filter(t => t.assigneeId === bd.id);

      const waiting = bdTickets.filter(t => t.status === "SUBMITTED" || t.status === "ACKNOWLEDGED").length;
      const inProgress = bdTickets.filter(t => t.status === "IN_PROGRESS").length;
      const completedToday = bdTickets.filter(t => t.status === "RESOLVED" && t.resolvedAt && new Date(t.resolvedAt) >= today).length;

      // Monthly metrics
      const completedThisMonth = bdTickets.filter(t => 
        t.status === "RESOLVED" && 
        t.resolvedAt && 
        new Date(t.resolvedAt) >= monthStart && 
        new Date(t.resolvedAt) <= monthEnd
      ).length;

      const assignedThisMonth = bdTickets.filter(t => 
        t.createdAt && 
        new Date(t.createdAt) >= monthStart && 
        new Date(t.createdAt) <= monthEnd
      ).length;

      const unresolvedTickets = bdTickets.filter(t => t.status !== "RESOLVED");
      const totalUnresolved = unresolvedTickets.length;
      const sumProgress = unresolvedTickets.reduce((acc, t) => acc + (t.progressPercent || 0), 0);
      const averageProgress = totalUnresolved > 0 ? Math.round(sumProgress / totalUnresolved) : 0;

      return {
        id: bd.id,
        name: bd.fullName,
        total: totalUnresolved,
        waiting,
        inProgress,
        completedToday,
        completedThisMonth,
        assignedThisMonth,
        averageProgress
      };
    });

    const teamMonthlyTotals = {
      completedThisMonth: summary.reduce((acc, s) => acc + s.completedThisMonth, 0),
      assignedThisMonth: summary.reduce((acc, s) => acc + s.assignedThisMonth, 0) + unassignedAssignedThisMonth,
      waiting: summary.reduce((acc, s) => acc + s.waiting, 0) + unassignedWaiting,
      inProgress: summary.reduce((acc, s) => acc + s.inProgress, 0),
      completedToday: summary.reduce((acc, s) => acc + s.completedToday, 0),
      unassignedCount: unassignedWaiting
    };

    return { 
      success: true, 
      data: summary,
      meta: {
        teamMonthlyTotals,
        monthStart,
        monthEnd
      }
    };
  } catch (error: any) {
    console.error("Error fetching BD workload summary:", error);
    return { success: false, error: error.message };
  }
}

// Convert ticket to BD Project
export async function convertTicketToProject(ticketId: string, projectDetails: { name: string, objective: string, workTypeId: string, urgency: string }) {
  try {
    const user = await getUser();
    if (!user || (!user.role.includes('Business Development') && !user.role.includes('Admin'))) {
      return { success: false, error: "Unauthorized" };
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket not found" };
    if (ticket.status === 'CONVERTED') return { success: false, error: "Ticket already converted" };

    // Create the BD Project
    const project = await prisma.bDProject.create({
      data: {
        name: projectDetails.name,
        objective: projectDetails.objective,
        workTypeId: projectDetails.workTypeId,
        urgency: projectDetails.urgency,
        requesterId: ticket.reporterId || user.id,
        ownerId: user.id,
        supportTicketId: ticketId,
        status: 'PENDING_REVIEW'
      }
    });

    // Add activity log to BDProject
    await prisma.bDActivity.create({
      data: {
        projectId: project.id,
        userId: user.id,
        action: 'PROJECT_CREATED',
        details: 'Project created from converting Ticket #' + ticket.ticketNumber
      }
    });

    // Update ticket status
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CONVERTED' }
    });

    // Add ticket log
    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: user.id,
        action: 'CONVERTED_TO_PROJECT',
        details: 'แปลงเป็นโปรเจกต์: ' + project.name
      }
    });

    // Add comment for user
    await prisma.ticketComment.create({
      data: {
        ticketId,
        userId: user.id,
        message: 'ปัญหานี้ถูกแปลงเป็นโปรเจกต์/แผนงานเรียบร้อยแล้ว: ' + project.name + '\nสถานะของรายการนี้จะถูกหยุดไว้เพื่อไปติดตามในระบบโปรเจกต์แทน'
      }
    });

    revalidatePath('/bd/tickets');
    revalidatePath('/support/tickets');
    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true, data: project };
  } catch (error: any) {
    console.error("Error converting ticket to project:", error);
    return { success: false, error: error.message };
  }
}

// Convert ticket to BD Task
export async function convertTicketToTask(ticketId: string, taskDetails: { projectId: string, name: string }) {
  try {
    const user = await getUser();
    if (!user || (!user.role.includes('Business Development') && !user.role.includes('Admin'))) {
      return { success: false, error: "Unauthorized" };
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket not found" };
    if (ticket.status === 'CONVERTED') return { success: false, error: "Ticket already converted" };

    // Get project info
    const project = await prisma.bDProject.findUnique({ where: { id: taskDetails.projectId } });
    if (!project) return { success: false, error: "Project not found" };

    // Get max orderIndex
    const maxOrder = await prisma.bDTask.aggregate({
      where: { projectId: taskDetails.projectId },
      _max: { orderIndex: true }
    });
    const nextOrder = (maxOrder._max.orderIndex || 0) + 1;

    // Create the BD Task
    const task = await prisma.bDTask.create({
      data: {
        projectId: taskDetails.projectId,
        name: taskDetails.name,
        orderIndex: nextOrder,
        assigneeId: user.id,
        supportTicketId: ticketId,
        status: 'PENDING'
      }
    });

    // Add activity log to BDProject
    await prisma.bDActivity.create({
      data: {
        projectId: taskDetails.projectId,
        userId: user.id,
        action: 'TASK_ADDED',
        details: 'Task "' + task.name + '" added from converting Ticket #' + ticket.ticketNumber
      }
    });

    // Update ticket status
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CONVERTED' }
    });

    // Add ticket log
    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: user.id,
        action: 'CONVERTED_TO_TASK',
        details: 'แปลงเป็นงานย่อยในโปรเจกต์: ' + project.name
      }
    });

    // Add comment for user
    await prisma.ticketComment.create({
      data: {
        ticketId,
        userId: user.id,
        message: 'ปัญหานี้ถูกแปลงเป็นงานย่อยในโปรเจกต์: ' + project.name + '\nสถานะของรายการนี้จะถูกหยุดไว้เพื่อไปติดตามในระบบโปรเจกต์แทน'
      }
    });

    revalidatePath('/bd/tickets');
    revalidatePath('/support/tickets');
    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true, data: task };
  } catch (error: any) {
    console.error("Error converting ticket to task:", error);
    return { success: false, error: error.message };
  }
}

// Add attachments to ticket (BD/HR side)
export async function addTicketAttachments(ticketId: string, newAttachmentUrls: string[]) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isBD = user.role.includes('Business Development') || user.role === 'BD Intern';
    const isAdmin = ['SUPER_ADMIN', 'ผู้จัดการ', 'admin'].includes(user.role);
    if (!isBD && !isAdmin) {
      return { success: false, error: "Unauthorized to add attachments" };
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket not found" };

    const existing = (ticket.attachments as string[]) || [];
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        attachments: [...existing, ...newAttachmentUrls],
        logs: {
          create: {
            userId: user.id,
            action: "แนบไฟล์",
            details: `แนบไฟล์เพิ่มเติม ${newAttachmentUrls.length} ไฟล์`,
          },
        },
      },
    });

    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error adding ticket attachments:", error);
    return { success: false, error: error.message };
  }
}

// Update ticket category
export async function updateTicketCategory(ticketId: string, category: string) {
  try {
    const user = await getUser();
    if (!user || (!user.role.includes('Business Development') && !user.role.includes('Admin'))) {
      return { success: false, error: "Unauthorized" };
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket not found" };

    const oldCategory = ticket.category;
    if (oldCategory === category) return { success: true };

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { category }
    });

    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: user.id,
        action: 'CATEGORY_UPDATED',
        details: 'Changed category from ' + oldCategory + ' to ' + category
      }
    });

    revalidatePath('/bd/tickets');
    revalidatePath('/support/tickets');
    revalidatePath(`/bd/tickets/${ticketId}`);
    revalidatePath(`/support/tickets/${ticketId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating ticket category:", error);
    return { success: false, error: error.message };
  }
}
