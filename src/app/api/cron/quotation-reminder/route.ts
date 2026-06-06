import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import {
  pushLineMessage,
  getLineUserIdByCrmUserId,
  getLineUserIdByEmpId,
  quotationReminderMessage,
} from '@/app/lib/lineNotify';

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

  // Retrieve active quotations
  const activeQuotations = await prisma.quotation.findMany({
    where: {
      status: { notIn: ['Invoice opened', 'Rejected', 'Cancelled', 'Win'] },
      quotationDate: { not: null },
    },
    include: {
      company: true,
      salesperson: true,
    },
  });

  // Calculate days elapsed or remaining based on user's preference.
  // User stated: "Calculated from quotationDate + 30 days = expiration date. Then count the remaining days before expiration."
  // And to notify at 30, 14, 7, 3, 1 remaining days.
  const REMAINING_REMINDER_DAYS = [1, 3, 7, 14, 30];
  let notified = 0;

  for (const quotation of activeQuotations) {
    const quotDate = new Date(quotation.quotationDate!);
    const elapsedDays = Math.floor(
      (now.getTime() - quotDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remainingDays = 30 - elapsedDays;

    if (!REMAINING_REMINDER_DAYS.includes(remainingDays)) continue;

    // Use Set to collect LINE IDs instead of CRM User IDs since we need supervisor's LINE ID directly
    const lineIdsToNotify = new Set<string>();

    if (quotation.salespersonId) {
      const salesLineId = await getLineUserIdByCrmUserId(quotation.salespersonId);
      if (salesLineId) lineIdsToNotify.add(salesLineId);

      // Find the supervisor using supervisor_id in employees table
      const user = await prisma.user.findUnique({
        where: { id: quotation.salespersonId },
        select: { employeeId: true },
      });
      if (user?.employeeId) {
        const employee = await prisma.employees.findUnique({
          where: { emp_id: user.employeeId },
          select: { supervisor_id: true },
        });
        if (employee?.supervisor_id) {
          const supervisorLineId = await getLineUserIdByEmpId(employee.supervisor_id);
          if (supervisorLineId) lineIdsToNotify.add(supervisorLineId);
        }
      }
    }

    const message = quotationReminderMessage(quotation, remainingDays);

    for (const lineUserId of lineIdsToNotify) {
      await pushLineMessage(lineUserId, [message]);
      notified++;
    }
  }

  return NextResponse.json({ success: true, notified });
}
