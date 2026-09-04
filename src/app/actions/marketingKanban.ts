"use server";

import prisma from "@/app/lib/db";

export async function getMarketingBoardData(userId?: string) {
  try {
    let board = await prisma.kanbanBoard.findFirst({
      include: {
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
                comments: {
                  orderBy: { createdAt: "desc" },
                  take: 10,
                },
                activityLogs: {
                  orderBy: { timestamp: "desc" },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      board = await prisma.kanbanBoard.create({
        data: {
          name: "Marketing Board",
          ownerId: userId || null,
          lists: {
            create: [
              { name: "Backlog (Todo)", position: 1000 },
              { name: "Assigned to Team", position: 2000 },
              { name: "Product & Service Review", position: 3000 },
              { name: "Approval / Revise", position: 4000 },
              { name: "Done", position: 5000 },
            ],
          },
        },
        include: {
          lists: {
            orderBy: { position: "asc" },
            include: {
              cards: {
                orderBy: { position: "asc" },
                include: {
                  attachments: true,
                  comments: true,
                  activityLogs: true,
                },
              },
            },
          },
        },
      });
    }

    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        employeeId: true,
        employeeSale: { select: { nickname: true } },
      },
    });

    const employeeIds = allUsers.map((u) => u.employeeId).filter(Boolean) as string[];

    let nicknameMap = new Map<string, string>();
    try {
      const employees = await (prisma as any).employees.findMany({
        where: { emp_id: { in: employeeIds } },
        select: { emp_id: true, nickname: true },
      });
      employees.forEach((e: any) => {
        if (e.nickname) nicknameMap.set(e.emp_id, e.nickname);
      });
    } catch (e) {
      console.warn("Could not fetch from employees table", e);
    }

    const allowedRoles = [
      "MARKETING",
      "SERVICE",
      "SERVICE_ENGINEER",
      "SERVICE_MGR",
      "MANAGER",
      "SUPER_ADMIN",
      "PROJECT",
      "การตลาด",
      "บริการ",
      "ผู้จัดการ",
      "โปรเจค",
      "โครงการ",
      "SALES",
      "SALE",
      "เซลส์",
      "ขาย",
    ];

    const users = allUsers
      .filter((u) => {
        const roleStr = (u.role || "").toUpperCase();
        return allowedRoles.some((r) => roleStr.includes(r));
      })
      .map((u) => {
        const nickname = nicknameMap.get(u.employeeId as string) || u.employeeSale?.nickname;
        return {
          id: u.id,
          fullName: nickname ? `${u.fullName} (${nickname})` : u.fullName,
          role: u.role,
        };
      });

    // Safely serialize for Client Components if Date objects are present
    const serializedBoard = JSON.parse(JSON.stringify(board));

    return { success: true, board: serializedBoard, users };
  } catch (error: any) {
    console.error("Error in getMarketingBoardData:", error);
    return { success: false, error: error.message, board: null, users: [] };
  }
}
