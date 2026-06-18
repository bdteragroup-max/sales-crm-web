import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import {
  pushLineMessage,
  getLineUserIdByCrmUserId,
  quotationReminderMessage,
  teamQuotationSummaryMessage,
} from '@/app/lib/lineNotify';

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

  // Retrieve active quotations
  const activeQuotations = await prisma.quotation.findMany({
    where: {
      status: { notIn: ['เปิดบิลแล้ว', 'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ปฏิเสธ-อื่นๆ', 'ยกเลิก-Revise', 'Win'] },
      quotationDate: { not: null },
    },
    include: {
      company: true,
      salesperson: true,
    },
  });

  const REMAINING_REMINDER_DAYS = [1, 3, 7, 14, 30];
  let notified = 0;

  // We will group by supervisor
  // supervisor_emp_id -> { supervisorName: string, line_user_id: string, employeeData: Map<string, { employeeName: string, quotations: any[] }> }
  const supervisorMap = new Map<string, any>();

  for (const quotation of activeQuotations) {
    const quotDate = new Date(quotation.quotationDate!);
    const elapsedDays = Math.floor(
      (now.getTime() - quotDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remainingDays = 30 - elapsedDays;

    if (quotation.status?.startsWith('PO')) continue;
    if (!REMAINING_REMINDER_DAYS.includes(remainingDays)) continue;

    if (!quotation.salespersonId) continue;

    // Only include the notification for the quotation issued by the sales staff
    const role = quotation.salesperson?.role?.toLowerCase() || '';
    if (!role.includes('sales') && !role.includes('เซลล์') && !role.includes('ผู้จัดการฝ่ายขาย')) {
      continue;
    }

    // Group for supervisor (notify only the manager)
    const user = await prisma.user.findUnique({
      where: { id: quotation.salespersonId },
      select: { employeeId: true },
    });

    if (user?.employeeId) {
      const employee = await prisma.employees.findUnique({
        where: { emp_id: user.employeeId },
        select: { supervisor_id: true, name: true },
      });
      
      if (employee?.supervisor_id) {
        const supervisor = await prisma.employees.findUnique({
          where: { emp_id: employee.supervisor_id },
          select: { line_user_id: true, name: true, emp_id: true },
        });

        if (supervisor && supervisor.line_user_id) {
          if (!supervisorMap.has(supervisor.emp_id)) {
            supervisorMap.set(supervisor.emp_id, {
              supervisorName: supervisor.name,
              line_user_id: supervisor.line_user_id,
              employeeData: new Map<string, any>(),
            });
          }
          
          const supData = supervisorMap.get(supervisor.emp_id);
          if (!supData.employeeData.has(user.employeeId)) {
            supData.employeeData.set(user.employeeId, {
              employeeName: employee.name,
              quotations: []
            });
          }
          
          supData.employeeData.get(user.employeeId).quotations.push({ q: quotation, remainingDays });
        }
      }
    }
  }

  // Send team summaries to supervisors
  for (const supData of supervisorMap.values()) {
    const employeeDataArray = Array.from(supData.employeeData.values()) as { employeeName: string; quotations: { q: any; remainingDays: number; }[] }[];
    if (employeeDataArray.length > 0) {
      const teamMessage = teamQuotationSummaryMessage(supData.supervisorName, employeeDataArray);
      await pushLineMessage(supData.line_user_id, [teamMessage]);
      notified++;
    }
  }

  return NextResponse.json({ success: true, notified });
}
