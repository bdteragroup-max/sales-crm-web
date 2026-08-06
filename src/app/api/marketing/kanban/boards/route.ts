import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Since this is for the Marketing team, we'll return the first board we find
    // or create a default "Marketing Board" if none exists.
    let board = await prisma.kanbanBoard.findFirst({
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                attachments: true,
                comments: {
                  orderBy: { createdAt: 'desc' }
                },
                activityLogs: {
                  orderBy: { timestamp: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    if (!board) {
      board = await prisma.kanbanBoard.create({
        data: {
          name: 'Marketing Board',
          ownerId: user.id,
          lists: {
            create: [
              { name: 'Backlog (Todo)', position: 1000 },
              { name: 'Assigned to Team', position: 2000 },
              { name: 'Product & Service Review', position: 3000 },
              { name: 'Approval / Revise', position: 4000 },
              { name: 'Done', position: 5000 }
            ]
          }
        },
        include: {
          lists: {
            orderBy: { position: 'asc' },
            include: {
              cards: {
                orderBy: { position: 'asc' },
                include: {
                  attachments: true,
                  comments: true,
                  activityLogs: true
                }
              }
            }
          }
        }
      });
    }

    // Also fetch users so the frontend can assign cards, filter to Marketing only
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, employeeId: true, employeeSale: { select: { nickname: true } } }
    });

    const employeeIds = allUsers.map(u => u.employeeId).filter(Boolean);
    
    // Attempt to get nicknames from employees table
    let nicknameMap = new Map<string, string>();
    try {
      // Use any to bypass TS if employees model isn't strictly typed yet
      const employees = await (prisma as any).employees.findMany({
        where: { emp_id: { in: employeeIds } },
        select: { emp_id: true, nickname: true }
      });
      employees.forEach((e: any) => {
        if (e.nickname) nicknameMap.set(e.emp_id, e.nickname);
      });
    } catch (e) {
      console.warn('Could not fetch from employees table', e);
    }
    
    const users = allUsers.filter(u => {
      const roleStr = (u.role || '').toUpperCase();
      const allowedRoles = ["MARKETING", "SERVICE", "SERVICE_ENGINEER", "SERVICE_MGR", "MANAGER", "SUPER_ADMIN", "PROJECT", "การตลาด", "บริการ", "ผู้จัดการ", "โปรเจค", "โครงการ"];
      return allowedRoles.some(r => roleStr.includes(r));
    }).map(u => {
      const nickname = nicknameMap.get(u.employeeId) || u.employeeSale?.nickname;
      return {
        id: u.id,
        fullName: nickname ? `${u.fullName} (${nickname})` : u.fullName,
        role: u.role
      };
    });

    return NextResponse.json({ board, users });
  } catch (error: any) {
    console.error('Error in GET /api/marketing/kanban/boards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
