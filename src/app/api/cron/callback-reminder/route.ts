import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { callbackDailySummaryMessage, pushLineMessage, teamCallbackSummaryMessage } from '@/app/lib/lineNotify';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production') {
        // return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const callbacks = await prisma.telesale.findMany({
      where: {
        callbackAt: {
          lte: todayEnd,
        },
      },
      include: {
        company: true,
        user: true, 
      },
      orderBy: {
        callbackAt: 'asc',
      },
    });

    if (callbacks.length === 0) {
      return NextResponse.json({ success: true, message: 'No callbacks found for today.' });
    }

    // Group callbacks by user
    const userCallbacksMap = new Map<string, typeof callbacks>();
    for (const cb of callbacks) {
      if (!cb.user || !cb.user.employeeId) continue;
      const empId = cb.user.employeeId;
      if (!userCallbacksMap.has(empId)) {
        userCallbacksMap.set(empId, []);
      }
      userCallbacksMap.get(empId)!.push(cb);
    }

    let notificationsSent = 0;
    
    // Group for supervisor
    // supervisor_emp_id -> { supervisorName: string, line_user_id: string, employeeData: [] }
    const supervisorMap = new Map<string, any>();

    for (const [empId, userCallbacks] of userCallbacksMap.entries()) {
      const employee = await prisma.employees.findUnique({
        where: { emp_id: empId },
        select: { 
          name: true, 
          line_user_id: true, 
          supervisor_id: true 
        },
      });

      if (!employee) continue;

      // 1. Send individual summary to the sales rep
      if (employee.line_user_id) {
        const lineMessages = [callbackDailySummaryMessage(employee.name, userCallbacks)];
        await pushLineMessage(employee.line_user_id, lineMessages);
        notificationsSent++;
        console.log(`Sent callback summary to employee: ${employee.name}`);
      }

      // 2. Prepare data for the supervisor
      if (employee.supervisor_id) {
        const supervisor = await prisma.employees.findUnique({
          where: { emp_id: employee.supervisor_id },
          select: { line_user_id: true, name: true, emp_id: true },
        });

        if (supervisor && supervisor.line_user_id) {
          if (!supervisorMap.has(supervisor.emp_id)) {
            supervisorMap.set(supervisor.emp_id, {
              supervisorName: supervisor.name,
              line_user_id: supervisor.line_user_id,
              employeeData: []
            });
          }
          
          supervisorMap.get(supervisor.emp_id).employeeData.push({
            employeeName: employee.name,
            callbacks: userCallbacks
          });
        }
      }
    }

    // 3. Send Team Summary to each Supervisor
    for (const supData of supervisorMap.values()) {
      if (supData.employeeData.length > 0) {
        const teamMessage = teamCallbackSummaryMessage(supData.supervisorName, supData.employeeData);
        await pushLineMessage(supData.line_user_id, [teamMessage]);
        notificationsSent++;
        console.log(`Sent TEAM callback summary to supervisor: ${supData.supervisorName}`);
      }
    }

    return NextResponse.json({
      success: true,
      notifiedUsers: userCallbacksMap.size,
      supervisorMessages: supervisorMap.size,
      messagesSent: notificationsSent,
    });
  } catch (error) {
    console.error('Error executing callback reminder cron:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
