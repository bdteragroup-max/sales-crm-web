import prisma from "@/app/lib/db";

export type LineMessage = any;

export async function pushLineMessage(
  lineUserId: string,
  messages: LineMessage[]
) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CRM_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });
}

// Retrieve LINE User ID from TERA_db via emp_id
export async function getLineUserIdByEmpId(empId: string) {
  const employee = await prisma.employees.findUnique({
    where: { emp_id: empId },
    select: { line_user_id: true },
  });
  return employee?.line_user_id;
}

// Retrieve LINE User ID from CRM User
export async function getLineUserIdByCrmUserId(crmUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: crmUserId },
    select: { employeeId: true },
  });
  if (!user?.employeeId) return null;
  return getLineUserIdByEmpId(user.employeeId);
}

function formatBkkTime(date: Date) {
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Job step update
export function jobStepMessage(job: any, step: string, dept: string) {
  return {
    type: 'flex',
    altText: `📋 Job ${job.jobNumber} Update`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ef4444',
        contents: [
          {
            type: 'text',
            text: '📋 Job Update',
            color: '#ffffff',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `Job: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `Customer: ${job.customerName}`, size: 'sm', color: '#666' },
          { type: 'text', text: `step: ${step}`, size: 'sm' },
          { type: 'text', text: `Department: ${dept}`, size: 'sm', color: '#ef4444' },
          { type: 'text', text: `time: ${formatBkkTime(new Date())}`, size: 'xs', color: '#999' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#ef4444',
            action: {
              type: 'uri',
              label: 'View Details',
              uri: `${process.env.NEXT_PUBLIC_APP_URL}/jobs?jobId=${job.id}`,
            },
          },
        ],
      },
    },
  };
}

// Quotation reminder
export function quotationReminderMessage(quotation: any, daysSince: number) {
  const urgency = daysSince >= 14 ? '🔴' : daysSince >= 7 ? '🟡' : '🟢';
  return {
    type: 'flex',
    altText: `${urgency} ${quotation.quotationNumber} pending ${daysSince} days`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: daysSince >= 14 ? '#dc2626' : daysSince >= 7 ? '#d97706' : '#16a34a',
        contents: [
          {
            type: 'text',
            text: `${urgency} Quotation Reminder`,
            color: '#ffffff',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: quotation.quotationNumber, weight: 'bold' },
          { type: 'text', text: `Customer: ${quotation.company?.companyName}`, size: 'sm' },
          {
            type: 'text',
            text: `Value: ฿${quotation.totalAmountBeforeVat?.toLocaleString()}`,
            size: 'sm',
          },
          {
            type: 'text',
            text: `Pending: ${daysSince} days`,
            size: 'sm',
            color: '#ef4444',
            weight: 'bold',
          },
          { type: 'text', text: `Status: ${quotation.status}`, size: 'sm' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#ef4444',
            action: {
              type: 'uri',
              label: 'Track Quote',
              uri: `${process.env.NEXT_PUBLIC_APP_URL}/sales?editId=${quotation.id}`,
            },
          },
        ],
      },
    },
  };
}
