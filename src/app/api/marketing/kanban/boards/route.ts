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
              { name: 'To Do', position: 1000 },
              { name: 'In Progress', position: 2000 },
              { name: 'Review', position: 3000 },
              { name: 'To Revise', position: 4000 },
              { name: 'Completed', position: 5000 }
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
      select: { id: true, fullName: true, role: true, employeeSale: { select: { nickname: true } } }
    });
    
    const users = allUsers.filter(u => {
      const roleStr = (u.role || '').toLowerCase();
      return ['marketing', 'การตลาด'].some(r => roleStr.includes(r));
    }).map(u => ({
      id: u.id,
      fullName: u.employeeSale?.nickname ? `${u.fullName} (${u.employeeSale.nickname})` : u.fullName,
      role: u.role
    }));

    return NextResponse.json({ board, users });
  } catch (error: any) {
    console.error('Error in GET /api/marketing/kanban/boards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
