import prisma from "@/app/lib/db";

export type LineMessage = any;

export async function pushLineMessage(
  lineUserId: string,
  messages: LineMessage[],
  botType: 'crm' | 'service' = 'crm'
) {
  const token = botType === 'service' 
    ? process.env.LINE_SERVICE_CHANNEL_ACCESS_TOKEN 
    : process.env.LINE_CRM_CHANNEL_ACCESS_TOKEN;

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Failed to send LINE message to ${lineUserId} using ${botType} bot:`, res.status, errorText);
  }
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

// Retrieve Service Manager LINE User IDs
export async function getServiceManagerLineIds(): Promise<string[]> {
  const serviceManagers = await prisma.user.findMany({
    where: {
      OR: [
        { role: { contains: "manager", mode: "insensitive" } },
        { role: { contains: "mgr", mode: "insensitive" } },
        { role: { contains: "ผู้จัดการ", mode: "insensitive" } }
      ]
    },
    select: { employeeId: true, role: true }
  });

  // Filter to ensure it's specifically the *Service* manager
  const actualServiceManagers = serviceManagers.filter(u => 
    u.role.toLowerCase().includes("service") || 
    u.role.includes("บริการ") || 
    u.role.includes("ช่าง")
  );

  const targets = actualServiceManagers.length > 0 ? actualServiceManagers : serviceManagers;

  const lineIds: string[] = [];
  for (const user of targets) {
    if (user.employeeId) {
      const lineId = await getLineUserIdByEmpId(user.employeeId);
      if (lineId && !lineIds.includes(lineId)) {
        lineIds.push(lineId);
      }
    }
  }

  return lineIds;
}

// Push message to multiple users
export async function pushLineMessageToTeam(lineUserIds: string[], messages: any[], botType: 'crm' | 'service' = 'crm') {
  const promises = lineUserIds.map(lineId => pushLineMessage(lineId, messages, botType));
  await Promise.allSettled(promises);
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  const bodyContents: any[] = [
    { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
    { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
    { type: 'text', text: `ขั้นตอน: ${step}`, size: 'sm' },
    { type: 'text', text: `แผนก: ${dept}`, size: 'sm', color: '#ef4444' },
    { type: 'text', text: `เวลา: ${formatBkkTime(new Date())}`, size: 'xs', color: '#999999' },
  ];

  if (job.flowVariant && dept.toLowerCase() === 'store') {
    const stockStatus = job.flowVariant === 'has_stock' ? 'มีของพร้อมดำเนินการ' : 
                        job.flowVariant === 'no_stock' ? 'ไม่มีของ (ต้องสั่ง/ผลิต)' : 
                        job.flowVariant === 'in_house_warranty' ? 'ในประกัน (ซ่อมเอง)' :
                        job.flowVariant === 'in_house_charged' ? 'นอกประกัน (ซ่อมเอง)' :
                        job.flowVariant === 'outsource' ? 'ส่งซ่อมนอก (Outsource)' :
                        job.flowVariant;
    
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ 
      type: 'text', 
      text: `ตัวเลือก: ${stockStatus}`, 
      size: 'sm', 
      color: job.flowVariant === 'has_stock' ? '#16a34a' : '#ea580c', 
      weight: 'bold', 
      margin: 'md' 
    });
  }

  if (job.deliveryMethod) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    const methodStr = job.deliveryMethod === 'in-house' ? 'จัดส่งเอง (In-house)' :
      job.deliveryMethod === 'courier' ? 'บริษัทขนส่ง (Courier)' :
        job.deliveryMethod;

    bodyContents.push({ type: 'text', text: `การจัดส่ง: ${methodStr}`, size: 'sm', color: '#0369a1', weight: 'bold', margin: 'md' });

    if (job.deliveryMethod === 'in-house' && job.deliveryDate) {
      bodyContents.push({ type: 'text', text: `วันที่จัดส่ง: ${new Date(job.deliveryDate).toLocaleDateString('th-TH')}`, size: 'sm' });
    }

    if (job.deliveryMethod === 'courier') {
      if (job.courierCompany) {
        bodyContents.push({ type: 'text', text: `บริษัทขนส่ง: ${job.courierCompany}`, size: 'sm' });
      }
      if (job.trackingNumber) {
        bodyContents.push({ type: 'text', text: `เลขพัสดุ: ${job.trackingNumber}`, size: 'sm' });
      }
    }
  }

  const message: any = {
    type: 'flex',
    altText: `📋 อัปเดตสถานะงาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ef4444',
        contents: [
          {
            type: 'text',
            text: '📋 อัปเดตสถานะงาน',
            color: '#ffffff',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
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
              label: 'ดูรายละเอียด',
              uri: `${appUrl}/jobs?jobId=${job.id}`,
            },
          },
        ],
      },
    },
  };

  if (job.trackingPhotoUrl) {
    message.contents.hero = {
      type: 'image',
      url: job.trackingPhotoUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    };
  }

  return message;
}

export function customSalesPRMessage(job: any, role: 'sales' | 'manager' | 'purchase') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  let headerText = '⚠️ แจ้งเตือนสินค้าหมดสต๊อก';
  let bodyText = '';
  let bgColor = '#f59e0b'; // amber/warning

  if (role === 'sales') {
    bodyText = 'สโตร์ไม่มีสินค้า กรุณาเปิด PR ให้ฝ่ายจัดซื้อเพื่อสั่งซื้อสินค้า';
  } else if (role === 'manager') {
    bodyText = `สโตร์แจ้งว่าสินค้าหมดสต๊อก ฝ่ายขายกำลังดำเนินการเปิด PR`;
  } else if (role === 'purchase') {
    headerText = '🛒 เตรียมรับ PR ใหม่';
    bgColor = '#3b82f6'; // blue
    bodyText = `สโตร์แจ้งว่าสินค้าหมด ฝ่ายขายกำลังเตรียมเปิด PR สำหรับงานนี้`;
  }

  const bodyContents: any[] = [
    { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
    { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: bodyText, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#ef4444' },
    { type: 'text', text: `เวลา: ${formatBkkTime(new Date())}`, size: 'xs', color: '#999999', margin: 'md' },
  ];

  return {
    type: 'flex',
    altText: `⚠️ แจ้งเตือนงาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: bgColor,
        contents: [
          {
            type: 'text',
            text: headerText,
            color: '#ffffff',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: bgColor,
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดงาน',
              uri: `${appUrl}/jobs?jobId=${job.id}`,
            },
          },
        ],
      },
    },
  };
}

export function customPurchasePOMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `🛒 แจ้งเตือน PO งาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#3b82f6', // blue
        contents: [
          { type: 'text', text: '🛒 ฝ่ายจัดซื้อบันทึก PO แล้ว', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ฝ่ายจัดซื้อได้ทำการบันทึก PO เรียบร้อยแล้ว กรุณาตรวจสอบและกดยืนยันรับทราบ PO`, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#ef4444' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#3b82f6',
            action: { type: 'uri', label: 'ตรวจสอบและยืนยัน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

export function customSalesAcknowledgeMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `✅ ฝ่ายขายรับทราบ PO งาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981', // green
        contents: [
          { type: 'text', text: '✅ ฝ่ายขายรับทราบ PO แล้ว', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ฝ่ายขายได้ตรวจสอบและยืนยันรับทราบ PO แล้ว กรุณาดำเนินการรอสินค้าเข้าสโตร์ต่อไป`, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#10b981' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10b981',
            action: { type: 'uri', label: 'ดูรายละเอียดงาน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

export function customStockArrivedMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `📦 สินค้าเข้าแล้ว งาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981', // green
        contents: [
          { type: 'text', text: '📦 สินค้ามาถึงแล้ว', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ฝ่ายจัดซื้อแจ้งว่าสินค้าเข้ามาถึงแล้ว สโตร์กรุณาตรวจสอบและรับสินค้า`, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#10b981' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10b981',
            action: { type: 'uri', label: 'ดูรายละเอียดงาน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

export function customStoreReceivedMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `✅ สโตร์รับสินค้า งาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#8b5cf6', // purple
        contents: [
          { type: 'text', text: '✅ สโตร์รับสินค้าครบถ้วน', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `สโตร์ได้รับและตรวจสอบสินค้าครบถ้วน พร้อมดำเนินการขั้นตอนต่อไป`, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#8b5cf6' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#8b5cf6',
            action: { type: 'uri', label: 'ดูรายละเอียดงาน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

export function customRepairClosedMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `✅ งานซ่อมเสร็จสิ้น งาน ${job.jobNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981', // green
        contents: [
          { type: 'text', text: '✅ งานซ่อมเสร็จสิ้น', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ฝ่ายบริการซ่อมสินค้าเสร็จสิ้นแล้ว ฝ่ายขายกรุณาเตรียมทำใบเสนอราคาค่าซ่อมและติดตามลูกค้า`, size: 'sm', wrap: true, margin: 'md', weight: 'bold', color: '#10b981' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10b981',
            action: { type: 'uri', label: 'ดูรายละเอียดงาน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

// Quotation reminder
export function quotationReminderMessage(quotation: any, remainingDays: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  const urgency = remainingDays <= 3 ? '🔴' : remainingDays <= 7 ? '🟡' : '🟢';
  const bgColor = remainingDays <= 3 ? '#dc2626' : remainingDays <= 7 ? '#d97706' : '#16a34a';
  return {
    type: 'flex',
    altText: `${urgency} การแจ้งเตือนใบเสนอราคา ${quotation.quotationNumber} เหลือเวลา ${remainingDays} วัน`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: bgColor,
        contents: [
          {
            type: 'text',
            text: `${urgency} แจ้งเตือนใบเสนอราคา`,
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
          { type: 'text', text: `ลูกค้า: ${quotation.company?.companyName}`, size: 'sm' },
          {
            type: 'text',
            text: `มูลค่า: ฿${quotation.totalAmountBeforeVat?.toLocaleString()}`,
            size: 'sm',
          },
          {
            type: 'text',
            text: `เหลือเวลาอีก: ${remainingDays} วัน`,
            size: 'sm',
            color: '#ef4444',
            weight: 'bold',
          },
          { type: 'text', text: `สถานะ: ${quotation.status}`, size: 'sm' },
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
              label: 'ติดตามใบเสนอราคา',
              uri: `${appUrl}/sales?editId=${quotation.id}`,
            },
          },
        ],
      },
    },
  };
}

// Callback daily summary
export function callbackDailySummaryMessage(employeeName: string, callbacks: any[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  // Format each callback as a box
  const callbackBoxes = callbacks.slice(0, 10).map((cb: any, index: number) => {
    const cbDate = new Date(cb.callbackAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = cbDate.getTime() < today.getTime();
    const timeStr = isOverdue
      ? cbDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + cbDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : cbDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const prefix = isOverdue ? '⚠️ เกินกำหนด:' : 'เวลา:';
    const color = isOverdue ? '#ef4444' : '#0369a1';

    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `${index + 1}. ${prefix} ${timeStr} น.`, weight: 'bold', size: 'sm', color: color },
        { type: 'text', text: `บริษัท: ${cb.company?.companyName || 'ไม่ระบุ'}`, size: 'sm' },
        { type: 'text', text: `วัตถุประสงค์: ${cb.meetingObjective || 'ไม่ระบุ'}`, size: 'xs', color: '#666666', wrap: true },
        { type: 'separator', margin: 'md' }
      ]
    };
  });

  if (callbacks.length > 10) {
    callbackBoxes.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        { type: 'text', text: `... และอีก ${callbacks.length - 10} รายการ`, size: 'sm', color: '#999999', align: 'center' }
      ]
    } as any);
  }

  return {
    type: 'flex',
    altText: `📞 สรุปนัดโทรกลับวันนี้ของคุณ ${employeeName} มีทั้งหมด ${callbacks.length} รายการ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0284c7', // Sky blue color for Telesales/Callbacks
        contents: [
          {
            type: 'text',
            text: '📞 สรุปนัดโทรกลับวันนี้',
            color: '#ffffff',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `พนักงาน: ${employeeName}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `จำนวนนัดหมาย: ${callbacks.length} รายการ`, size: 'sm', margin: 'md' },
          { type: 'separator', margin: 'md' },
          ...callbackBoxes
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0284c7',
            action: {
              type: 'uri',
              label: 'ดูนัดหมายทั้งหมด',
              uri: `${appUrl}/telesales?tab=callbacks`,
            },
          },
        ],
      },
    },
  };
}

// Team Callback Summary for Supervisor
export function teamCallbackSummaryMessage(supervisorName: string, employeeData: { employeeName: string, callbacks: any[] }[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  let totalCallbacks = 0;
  employeeData.forEach(e => totalCallbacks += e.callbacks.length);

  const employeeBoxes = employeeData.map(e => {
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'xs',
      contents: [
        { type: 'text', text: `👤 ${e.employeeName} (${e.callbacks.length} รายการ)`, weight: 'bold', size: 'sm', color: '#0369a1' },
        {
          type: 'text', text: e.callbacks.slice(0, 5).map(cb => {
            const cbDate = new Date(cb.callbackAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOverdue = cbDate.getTime() < today.getTime();
            return `- ${cb.company?.companyName || 'ไม่ระบุ'} ${isOverdue ? '(เกินกำหนด)' : ''}`;
          }).join('\n'), size: 'xs', wrap: true
        },
        ...(e.callbacks.length > 5 ? [{ type: 'text', text: `...และอีก ${e.callbacks.length - 5} รายการ`, size: 'xs', color: '#999999' }] : []),
        { type: 'separator', margin: 'md' }
      ]
    };
  });

  return {
    type: 'flex',
    altText: `📞 สรุปนัดโทรกลับทีมงานของคุณ ${supervisorName} มีทั้งหมด ${totalCallbacks} รายการ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0284c7',
        contents: [
          { type: 'text', text: '👥 สรุปนัดโทรกลับของทีม', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หัวหน้าทีม: ${supervisorName}`, weight: 'bold', size: 'sm' },
          { type: 'text', text: `รวมนัดหมายของทีม: ${totalCallbacks} รายการ`, size: 'xs', color: '#666666', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...employeeBoxes
        ] as any[],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0284c7',
            action: { type: 'uri', label: 'ดูนัดหมายทีมทั้งหมด', uri: `${appUrl}/telesales?tab=callbacks` },
          },
        ],
      },
    },
  };
}

// Team Quotation Summary for Supervisor
export function teamQuotationSummaryMessage(supervisorName: string, employeeData: { employeeName: string, quotations: { q: any, remainingDays: number }[] }[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  let totalQuotations = 0;
  employeeData.forEach(e => totalQuotations += e.quotations.length);

  const employeeBoxes = employeeData.map(e => {
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'xs',
      contents: [
        { type: 'text', text: `👤 ${e.employeeName} (${e.quotations.length} รายการ)`, weight: 'bold', size: 'sm', color: '#c2410c' },
        {
          type: 'text', text: e.quotations.slice(0, 5).map(item => {
            return `- ${item.q.quotationNumber} (ใน ${item.remainingDays} วัน)`;
          }).join('\n'), size: 'xs', wrap: true
        },
        ...(e.quotations.length > 5 ? [{ type: 'text', text: `...และอีก ${e.quotations.length - 5} รายการ`, size: 'xs', color: '#999999' }] : []),
        { type: 'separator', margin: 'md' }
      ]
    };
  });

  return {
    type: 'flex',
    altText: `⚠️ สรุปใบเสนอราคาของทีมคุณ ${supervisorName} มีทั้งหมด ${totalQuotations} รายการ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ea580c',
        contents: [
          { type: 'text', text: '👥 สรุปใบเสนอราคาของทีม', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หัวหน้าทีม: ${supervisorName}`, weight: 'bold', size: 'sm' },
          { type: 'text', text: `รวมรายการของทีม: ${totalQuotations} รายการ`, size: 'xs', color: '#666666', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...employeeBoxes
        ] as any[],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#ea580c',
            action: { type: 'uri', label: 'ดูใบเสนอราคาทีมทั้งหมด', uri: `${appUrl}/sales` },
          },
        ],
      },
    },
  };
}

// Schedule Daily Summary
export function scheduleDailyMessage(employeeName: string, schedules: any[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  const scheduleBoxes = schedules.slice(0, 10).map((sched: any, index: number) => {
    const time = new Date(sched.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const location = sched.company?.companyName || sched.description || 'ไม่ระบุสถานที่';
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `${index + 1}. เวลา: ${time} น.`, weight: 'bold', size: 'sm', color: '#047857' },
        { type: 'text', text: `เรื่อง: ${sched.title || 'ไม่ระบุ'}`, size: 'sm' },
        { type: 'text', text: `สถานที่: ${location}`, size: 'xs', color: '#666666', wrap: true },
        { type: 'separator', margin: 'md' }
      ]
    };
  });

  return {
    type: 'flex',
    altText: `📅 ตารางนัดหมายวันนี้ของคุณ ${employeeName} มีทั้งหมด ${schedules.length} รายการ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#059669', // Emerald color for Schedule
        contents: [
          { type: 'text', text: '📅 ตารางนัดหมายวันนี้', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `พนักงาน: ${employeeName}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `จำนวนนัดหมาย: ${schedules.length} รายการ`, size: 'sm', margin: 'md' },
          { type: 'separator', margin: 'md' },
          ...scheduleBoxes
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#059669',
            action: { type: 'uri', label: 'ดูนัดหมายทั้งหมด', uri: `${appUrl}/schedule` },
          },
        ],
      },
    },
  };
}

// Team Schedule Summary for Supervisor
export function teamScheduleSummaryMessage(supervisorName: string, employeeData: { employeeName: string, schedules: any[] }[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  let totalSchedules = 0;
  employeeData.forEach(e => totalSchedules += e.schedules.length);

  const employeeBoxes = employeeData.map(e => {
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'xs',
      contents: [
        { type: 'text', text: `👤 ${e.employeeName} (${e.schedules.length} รายการ)`, weight: 'bold', size: 'sm', color: '#047857' },
        {
          type: 'text', text: e.schedules.slice(0, 5).map(sched => {
            const time = new Date(sched.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const location = sched.company?.companyName || 'ไม่ระบุสถานที่';
            return `- ${time} น. ไป ${location}`;
          }).join('\n'), size: 'xs', wrap: true
        },
        ...(e.schedules.length > 5 ? [{ type: 'text', text: `...และอีก ${e.schedules.length - 5} รายการ`, size: 'xs', color: '#999999' }] : []),
        { type: 'separator', margin: 'md' }
      ]
    };
  });

  return {
    type: 'flex',
    altText: `📅 สรุปตารางนัดหมายทีมคุณ ${supervisorName} วันนี้ มีทั้งหมด ${totalSchedules} รายการ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#059669',
        contents: [
          { type: 'text', text: '👥 สรุปนัดหมายของทีมวันนี้', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หัวหน้าทีม: ${supervisorName}`, weight: 'bold', size: 'sm' },
          { type: 'text', text: `รวมนัดหมายของทีม: ${totalSchedules} รายการ`, size: 'xs', color: '#666666', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...employeeBoxes
        ] as any[],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#059669',
            action: { type: 'uri', label: 'ดูตารางนัดหมายทีม', uri: `${appUrl}/schedule` },
          },
        ],
      },
    },
  };
}

// Installation Plan Update Message
export function installationPlanUpdatedMessage(order: any, technicianName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  const startDateStr = order.plannedStartDate ? new Date(order.plannedStartDate).toLocaleString('th-TH') : '-';
  const endDateStr = order.plannedEndDate ? new Date(order.plannedEndDate).toLocaleString('th-TH') : '-';

  return {
    type: 'flex',
    altText: `🛠️ อัปเดตแผนงานติดตั้ง งาน ${order.installationNo}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4f46e5', // indigo
        contents: [
          { type: 'text', text: '🛠️ อัปเดตแผนงานติดตั้ง', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ใบงาน: ${order.installationNo}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${order.company || order.customer || '-'}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ผู้รับผิดชอบ: ${technicianName}`, size: 'sm', margin: 'md', weight: 'bold' },
          { type: 'text', text: `สถานที่: ${order.workLocation || '-'}`, size: 'sm', wrap: true },
          { type: 'text', text: `เริ่ม: ${startDateStr}`, size: 'sm' },
          { type: 'text', text: `สิ้นสุด: ${endDateStr}`, size: 'sm' },
          { type: 'text', text: `รายละเอียดแผนงาน:`, size: 'xs', margin: 'md', color: '#666666' },
          { type: 'text', text: order.workPlan || '-', size: 'sm', wrap: true, color: '#4f46e5' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#4f46e5',
            action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${appUrl}/service/installation` },
          },
        ],
      },
    },
  };
}

// Estimation Notifications
export function estimationRequestMessage(customerName: string, items: string[], salesperson: string, requirementId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `🔔 มีรายการรอประเมินราคาใหม่: ${customerName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#eab308', // yellow-500
        contents: [
          { type: 'text', text: '🔔 รอประเมินราคาใหม่', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ลูกค้า: ${customerName}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `รายการ: ${items.join(', ')}`, size: 'sm', wrap: true, margin: 'md' },
          { type: 'text', text: `โดย: ${salesperson}`, size: 'sm', color: '#666666', margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#eab308',
            action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${appUrl}/service/estimations` },
          },
        ],
      },
    },
  };
}

export function estimationCompletedMessage(customerName: string, price: number, note: string, servicePerson: string, requirementId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `✅ ประเมินราคาเสร็จแล้ว: ${customerName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981', // green-500
        contents: [
          { type: 'text', text: '✅ ประเมินราคาเสร็จแล้ว', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ลูกค้า: ${customerName}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ราคารวม: ฿${price.toLocaleString()}`, size: 'md', color: '#ef4444', weight: 'bold', margin: 'md' },
          { type: 'text', text: `หมายเหตุ: ${note || '-'}`, size: 'sm', wrap: true, margin: 'sm' },
          { type: 'text', text: `ประเมินโดย: ${servicePerson}`, size: 'sm', color: '#666666', margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10b981',
            action: { type: 'uri', label: 'เปิดใบเสนอราคา', uri: `${appUrl}/sales?reqId=${requirementId}` },
          },
        ],
      },
    },
  };
}

export function estimationAssignedMessage(customerName: string, items: string[], dueDate: Date, assignedBy: string, requirementId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

  return {
    type: 'flex',
    altText: `🛠️ ได้รับมอบหมายงานประเมินราคา: ${customerName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f97316', // orange-500
        contents: [
          { type: 'text', text: '🛠️ มอบหมายงานประเมินราคา', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ลูกค้า: ${customerName}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `รายการ: ${items.join(', ')}`, size: 'sm', wrap: true, margin: 'md' },
          { type: 'text', text: `กำหนดส่ง: ${new Date(dueDate).toLocaleDateString('th-TH')}`, size: 'sm', color: '#ef4444', weight: 'bold', margin: 'md' },
          { type: 'text', text: `มอบหมายโดย: ${assignedBy}`, size: 'sm', color: '#666666', margin: 'sm' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#f97316',
            action: { type: 'uri', label: 'ดูรายละเอียดและประเมิน', uri: `${appUrl}/service/estimations` },
          },
        ],
      },
    },
  };
}

export function installationAssignedMessage(order: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  const installationDate = order.installationDate ? new Date(order.installationDate).toLocaleDateString('th-TH') : 'ยังไม่ระบุวันที่';
  
  return {
    type: 'flex',
    altText: `📅 มอบหมายงานติดตั้ง/ตรวจเช็ค งาน ${order.installationNo}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f59e0b', // amber
        contents: [
          { type: 'text', text: '📅 มีงานติดตั้ง/ตรวจเช็คใหม่', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ใบงาน: ${order.installationNo}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${order.customer || order.company || 'ไม่ระบุ'}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ผู้รับผิดชอบ: ${order.technician}`, size: 'sm', color: '#000000', margin: 'md' },
          { type: 'text', text: `วันที่นัดหมาย: ${installationDate}`, size: 'sm', color: '#000000' },
          { type: 'text', text: `สถานที่: ${order.address || order.siteAddress || 'ไม่ระบุ'}`, size: 'xs', color: '#666666', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `กรุณาเข้าไปตรวจสอบรายละเอียดและอัปเดตผลการดำเนินงาน`, size: 'xs', color: '#f59e0b', wrap: true, margin: 'md', weight: 'bold' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#f59e0b',
            action: { type: 'uri', label: 'บันทึกการทำงาน', uri: `${appUrl}/service/installation` },
          },
        ],
      },
    },
  };
}

export function newServiceJobMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  return {
    type: 'flex',
    altText: `🚨 งานบริการใหม่: ${job.jobType} - ${job.customerName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ef4444', // red
        contents: [
          { type: 'text', text: `🚨 มีงาน ${job.jobType} ใหม่`, color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `หมายเลขงาน: ${job.jobNumber}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `รายการ: ${job.item}`, size: 'sm', wrap: true, margin: 'md' },
          { type: 'text', text: `ผู้ขาย: ${job.sellerName}`, size: 'xs', color: '#999999' },
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
            action: { type: 'uri', label: 'ดูรายละเอียดงาน', uri: `${appUrl}/jobs?jobId=${job.id}` },
          },
        ],
      },
    },
  };
}

export function newPendingInstallationJobMessage(job: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  return {
    type: 'flex',
    altText: `🚨 แจ้งเตือน: มีงานใหม่รอสร้างใบงาน (ติดตั้ง/ตรวจเช็ค)`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#eab308', // yellow
        contents: [
          { type: 'text', text: `🚨 มีงานใหม่รอสร้างใบงาน`, color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ประเภท: ${job.jobType}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${job.customerName}`, size: 'sm', color: '#666666' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `รายการ: ${job.item}`, size: 'sm', wrap: true, margin: 'md' },
          { type: 'text', text: `กรุณาสร้างใบงานเพื่อจ่ายงานให้ช่าง`, size: 'xs', color: '#eab308', weight: 'bold', margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#eab308',
            action: { type: 'uri', label: 'ไปที่หน้าจัดการติดตั้ง', uri: `${appUrl}/service/installation` },
          },
        ],
      },
    },
  };
}

export function newInstallationOrderMessage(order: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  return {
    type: 'flex',
    altText: `🛠️ แจ้งเตือน: มีใบสั่งงานติดตั้ง/ตรวจเช็คใหม่`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f59e0b', // amber
        contents: [
          { type: 'text', text: '🛠️ ใบสั่งงานติดตั้ง/ตรวจเช็คใหม่', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ใบงาน: ${order.installationNo}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${order.customer || order.company || 'ไม่ระบุ'}`, size: 'sm', color: '#666666' },
          { type: 'text', text: `สถานที่: ${order.address || order.siteAddress || 'ไม่ระบุ'}`, size: 'xs', color: '#666666', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `กรุณาพิจารณามอบหมายช่างและลงวันที่นัดหมาย`, size: 'xs', color: '#f59e0b', wrap: true, margin: 'md', weight: 'bold' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#f59e0b',
            action: { type: 'uri', label: 'จัดการงานติดตั้ง', uri: `${appUrl}/service/installation` },
          },
        ],
      },
    },
  };
}

export function morningScheduleMessage(orders: any[], dateString: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  if (orders.length === 0) {
    return {
      type: 'text',
      text: `☀️ สวัสดีตอนเช้า (${dateString})\nวันนี้ไม่มีรายการนัดหมายเข้าหน้างานครับ`
    };
  }

  const orderContents = orders.slice(0, 10).map(order => ({
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    contents: [
      { type: 'text', text: `📅 ${order.installationNo || order.job?.jobNumber || '-'}`, weight: 'bold', size: 'sm', color: '#0f172a' },
      { type: 'text', text: `🏢 ${order.company || order.job?.customerName || 'ไม่ระบุ'}`, size: 'xs', color: '#64748b' },
      { type: 'text', text: `🔧 ${order.jobName || order.job?.item || 'ไม่ระบุ'}`, size: 'xs', wrap: true, color: '#64748b' },
      { type: 'text', text: `👨‍🔧 ช่าง: ${order.technician || 'ยังไม่ระบุช่าง'}`, size: 'xs', color: '#0ea5e9' },
      { type: 'separator', margin: 'md' }
    ]
  }));

  if (orders.length > 10) {
    orderContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        { type: 'text', text: `และอีก ${orders.length - 10} รายการ...`, size: 'xs', color: '#64748b', align: 'center' } as any
      ]
    });
  }

  return {
    type: 'flex',
    altText: `☀️ แจ้งเตือนงานหน้างานประจำวัน (${dateString})`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0ea5e9', // light blue
        contents: [
          { type: 'text', text: `☀️ งานหน้างานวันนี้`, color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: dateString, color: '#ffffff', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `มีทั้งหมด ${orders.length} รายการ`, weight: 'bold', size: 'md', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...orderContents
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0ea5e9',
            action: { type: 'uri', label: 'ดูตารางคิวงาน', uri: `${appUrl}/service/installation` },
          }
        ]
      }
    }
  };
}

export function eveningOutstandingMessage(pendingInstallations: number, pendingJobs: number, pendingRepairs: number, dateString: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  const total = pendingInstallations + pendingJobs + pendingRepairs;
  
  if (total === 0) {
    return {
      type: 'text',
      text: `🌙 สรุปงานคงค้างประจำวัน (${dateString})\nยอดเยี่ยมมาก! ไม่มีงาน Service/ติดตั้ง ค้างในระบบครับ`
    };
  }

  return {
    type: 'flex',
    altText: `🌙 สรุปงานคงค้างประจำวัน (${dateString})`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f97316', // orange
        contents: [
          { type: 'text', text: `🌙 สรุปงานคงค้างวันนี้`, color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: dateString, color: '#ffffff', size: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'รอสร้างใบงาน (ติดตั้ง/ตรวจเช็ค):', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${pendingJobs} งาน`, size: 'sm', weight: 'bold', align: 'end', flex: 1, color: pendingJobs > 0 ? '#ef4444' : '#22c55e' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ใบงานติดตั้งค้างดำเนินการ:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${pendingInstallations} ใบงาน`, size: 'sm', weight: 'bold', align: 'end', flex: 1, color: pendingInstallations > 0 ? '#ef4444' : '#22c55e' }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'งานซ่อม/เคลม ที่ยังไม่ปิด:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${pendingRepairs} งาน`, size: 'sm', weight: 'bold', align: 'end', flex: 1, color: pendingRepairs > 0 ? '#ef4444' : '#22c55e' }
            ]
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'รวมงานคงค้างทั้งหมด:', size: 'md', weight: 'bold', flex: 2 },
              { type: 'text', text: `${total} งาน`, size: 'md', weight: 'bold', align: 'end', flex: 1, color: '#ef4444' }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#f97316',
            action: { type: 'uri', label: 'เข้าสู่ระบบ TERA CRM', uri: appUrl },
          }
        ]
      }
    }
  };
}

export function repairAssignedMessage(order: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  return {
    type: 'flex',
    altText: `🛠️ แจ้งเตือน: มอบหมายงานซ่อม/เคลม`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ef4444', // red
        contents: [
          { type: 'text', text: '🛠️ คุณได้รับมอบหมายงานซ่อม/เคลม', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ใบงาน: ${order.job?.jobNumber || order.jobId || '-'}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `ลูกค้า: ${order.company || order.job?.customerName || 'ไม่ระบุ'}`, size: 'sm', color: '#666666' },
          { type: 'text', text: `อาการ: ${order.symptoms || 'ไม่ระบุ'}`, size: 'xs', color: '#666666', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `กรุณาเข้าดำเนินการตรวจสอบและซ่อมแซม`, size: 'xs', color: '#ef4444', wrap: true, margin: 'md', weight: 'bold' },
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
            action: { type: 'uri', label: 'รายละเอียดงานซ่อม', uri: `${appUrl}/repair-orders` },
          },
        ],
      },
    },
  };
}

export function customMarketingLeadMessage(lead: any, salespersonName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  
  return {
    type: 'flex',
    altText: `🚨 แจ้งเตือน: มี Lead ใหม่จากทีมการตลาด`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ff2301', // brand red
        contents: [
          { type: 'text', text: '🚨 ได้รับ Lead ใหม่จาก Marketing', color: '#ffffff', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `ลูกค้า: ${lead.customerName || 'ไม่ระบุ'}`, weight: 'bold', size: 'md' },
          { type: 'text', text: `เบอร์โทร: ${lead.phoneNumber || '-'}`, size: 'sm', color: '#666666' },
          { type: 'text', text: `ความสนใจ: ${lead.productType || ''} ${lead.productOfInterest || ''}`, size: 'xs', color: '#666666', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `บันทึกการสนทนา:`, size: 'xs', color: '#ff2301', weight: 'bold', margin: 'md' },
          { type: 'text', text: lead.conversationContent || '-', size: 'xs', color: '#666666', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `ผู้ดูแล: ${salespersonName}`, size: 'xs', color: '#666666', margin: 'sm' },
          { type: 'text', text: `กรุณาติดต่อลูกค้าหรือสร้างนัดหมายในระบบ CRM`, size: 'xs', color: '#ff2301', wrap: true, margin: 'md', weight: 'bold' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#ff2301',
            action: { type: 'uri', label: 'ดูรายละเอียด Lead', uri: `${appUrl}/sales/leads` },
          },
        ],
      },
    },
  };
}