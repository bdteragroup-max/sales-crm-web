import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/db';
import { decrypt } from '@/app/lib/session';

export async function POST(request: Request) {
  try {
    const session = (await cookies()).get('session')?.value;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await decrypt(session);
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { employeeId: true }
    });

    if (!user?.employeeId) {
      return NextResponse.json({ error: 'User is not linked to an employee' }, { status: 400 });
    }

    const currentEmp = await prisma.employees.findUnique({
      where: { emp_id: user.employeeId },
      select: { department_id: true, emp_id: true }
    });

    if (!currentEmp) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 400 });
    }

    const body = await request.json();
    const { employeeId, flagDate, flagType, note } = body;

    if (!employeeId || !flagDate || !flagType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Security: Check if employeeId is in manager's department or supervised
    const targetEmp = await prisma.employees.findFirst({
      where: {
        emp_id: employeeId,
        OR: [
          { department_id: currentEmp.department_id },
          { supervisor_id: currentEmp.emp_id }
        ]
      }
    });

    if (!targetEmp) {
      return NextResponse.json({ error: 'Unauthorized to review flags for this employee' }, { status: 403 });
    }

    const dateObj = new Date(flagDate); // ensure it's a date

    // Upsert the flag review
    const review = await prisma.fuelFlagReview.upsert({
      where: {
        employeeId_flagDate_flagType: {
          employeeId,
          flagDate: dateObj,
          flagType
        }
      },
      update: {
        reviewedBy: user.employeeId,
        reviewedAt: new Date(),
        note: note || null
      },
      create: {
        employeeId,
        flagDate: dateObj,
        flagType,
        reviewedBy: user.employeeId,
        reviewedAt: new Date(),
        note: note || null
      }
    });

    return NextResponse.json({ success: true, data: review });

  } catch (error: any) {
    console.error("Error updating flag review:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
