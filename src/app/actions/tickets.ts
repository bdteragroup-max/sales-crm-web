"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

// 1. Create a ticket
export async function createTicket(data: {
  title: string;
  description: string;
  urgency: string;
  attachments?: string[];
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

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

    // Create ticket and initial log
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        title: data.title,
        description: data.description,
        urgency: data.urgency,
        attachments: data.attachments || [],
        reporterId: user.id,
        status: "SUBMITTED",
        logs: {
          create: {
            userId: user.id,
            action: "สร้างรายการแจ้งปัญหา",
            details: `ระดับความสำคัญ: ${data.urgency}`,
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
      await prisma.notification.createMany({
        data: bdUsers.map((bdUser) => ({
          userId: bdUser.id,
          title: "แจ้งปัญหาใหม่",
          message: `Ticket: ${ticketNumber} - ${data.title} (${data.urgency})`,
          type: "SUPPORT_TICKET",
          linkUrl: `/bd/tickets/${ticket.id}`,
        })),
      });
    }

    revalidatePath("/support/tickets");
    revalidatePath("/bd/tickets");

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

    const tickets = await prisma.supportTicket.findMany({
      where: {
        reporterId: user.id,
      },
      include: {
        assignee: {
          select: { fullName: true, id: true },
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
    await prisma.notification.create({
      data: {
        userId: existing.reporterId,
        title: "ปัญหาของคุณได้รับการรับทราบแล้ว",
        message: `ทีมงานรับเรื่อง ${existing.ticketNumber} ของคุณแล้ว`,
        type: "SUPPORT_TICKET",
        linkUrl: `/support/tickets/${existing.id}`,
      },
    });

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
    await prisma.notification.create({
      data: {
        userId: existing.reporterId,
        title: "อัปเดตความคืบหน้าปัญหา",
        message: `ปัญหา ${existing.ticketNumber} มีการอัปเดตความคืบหน้า: ${progressPercent}%`,
        type: "SUPPORT_TICKET",
        linkUrl: `/support/tickets/${existing.id}`,
      },
    });

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
    const targetUserId = isReporter ? existing.assigneeId : existing.reporterId;

    if (targetUserId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: "ความคิดเห็นใหม่ใน Ticket",
          message: `มีความคิดเห็นใหม่ใน ${existing.ticketNumber}: "${message.substring(0, 30)}..."`,
          type: "SUPPORT_TICKET",
          linkUrl: isReporter ? `/bd/tickets/${ticketId}` : `/support/tickets/${ticketId}`,
        },
      });
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
    await prisma.notification.create({
      data: {
        userId: newAssigneeId,
        title: "คุณได้รับมอบหมายปัญหาใหม่",
        message: `ผู้ดูแลระบบมอบหมาย Ticket ${existing.ticketNumber} ให้คุณ`,
        type: "SUPPORT_TICKET",
        linkUrl: `/bd/tickets/${existing.id}`,
      },
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
