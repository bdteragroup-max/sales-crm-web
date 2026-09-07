import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const round = searchParams.get('round');
  const year = searchParams.get('year');
  const method = searchParams.get('method');

  if (!round || !year) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Convert Buddhist Era (B.E.) to Common Era (C.E.) and offset timezone
  const ceYear = Number(year) - 543;
  const isRound1 = round === '1';
  
  // Adjusted for timezone UTC+7
  const startDate = new Date(`${ceYear}-${isRound1 ? '01' : '07'}-01T00:00:00+07:00`);
  const endMonth = isRound1 ? '06' : '12';
  const endDay = isRound1 ? '30' : '31';
  const endDate = new Date(`${ceYear}-${endMonth}-${endDay}T23:59:59+07:00`);

  try {
    const closedStatuses = ["เปิดบิลแล้ว", "PO แล้วรอเงินโอน", "PO แล้วรอสินค้า"];

    const quotations = await prisma.quotation.findMany({
      where: {
        salespersonId: {
          not: 'cmq7iv42y000004l496tyrofk' // Exclude Mr. Teerawat Pokphet
        },
        NOT: {
          OR: [
            { status: { startsWith: 'ปฏิเสธ' } },
            { status: { startsWith: 'ยกเลิก' } },
            { status: { in: ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'] } }
          ]
        },
        OR: [
          { status: { in: closedStatuses } },
          { poNumber: { not: null } },
          { billingDate: { not: null } }
        ],
        AND: [
          {
            OR: [
              { quotationDate: { gte: startDate, lte: endDate } },
              { poDate: { gte: startDate, lte: endDate } },
              { billingDate: { gte: startDate, lte: endDate } }
            ]
          }
        ]
      },
      select: {
        companyId: true,
        quotationNumber: true,
        status: true,
        poNumber: true,
        invoiceNumber: true,
        poDate: true,
        billingDate: true,
        quotationDate: true,
        totalAmountBeforeVat: true,
        actualClosingAmount: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            companyName: true,
            province: true,
            assignedUser: { select: { fullName: true } },
            contacts: {
              select: {
                id: true,
                contactName: true,
                position: true,
                mobilePhone: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true
          }
        }
      },
      orderBy: [
        { billingDate: 'desc' },
        { poDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Find companies that have already been evaluated in this round/year/method
    const existingSurveys = await prisma.customerSatisfaction.findMany({
      where: {
        surveyRound: parseInt(round),
        surveyYear: parseInt(year),
        ...(method ? { surveyMethod: method } : {})
      },
      select: { companyId: true }
    });
    const evaluatedCompanyIds = new Set(existingSurveys.map(s => s.companyId));

    // Aggregate by companyId with closed-sale metadata & PO reference
    const companyMap = new Map<string, any>();

    for (const q of quotations) {
      if (!q.company || evaluatedCompanyIds.has(q.company.id)) continue;
      
      const cleanPo = q.poNumber?.trim() || null;
      const cleanInvoice = q.invoiceNumber?.trim() || null;
      const isRejected = q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก') || ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'].includes(q.status);
      const isClosed = !isRejected && (closedStatuses.includes(q.status) || !!cleanPo || !!q.billingDate);

      const contactName = q.contact?.contactName || q.company.contacts?.[0]?.contactName || null;
      const contactPhone = q.contact?.mobilePhone || q.company.contacts?.[0]?.mobilePhone || null;

      if (!companyMap.has(q.companyId)) {
        companyMap.set(q.companyId, {
          ...q.company,
          primaryContactName: contactName,
          primaryContactPhone: contactPhone,
          isClosedSale: isClosed,
          closedStatus: q.status || 'เปิดบิลแล้ว',
          latestPoNumber: cleanPo,
          latestInvoiceNumber: cleanInvoice,
          latestQuotationNumber: q.quotationNumber || null,
          latestClosedDate: q.billingDate || q.poDate || q.quotationDate || null,
          actualClosingAmount: q.actualClosingAmount ?? q.totalAmountBeforeVat ?? null,
          closedQuotationsCount: isClosed ? 1 : 0
        });
      } else {
        const existing = companyMap.get(q.companyId);
        if (isClosed) {
          existing.closedQuotationsCount += 1;
        }
        if (!existing.primaryContactName && contactName) {
          existing.primaryContactName = contactName;
          existing.primaryContactPhone = contactPhone;
        }
        // If existing record did not have a PO number but current one does, prioritize PO
        if (!existing.latestPoNumber && cleanPo) {
          existing.latestPoNumber = cleanPo;
        }
        if (!existing.latestInvoiceNumber && cleanInvoice) {
          existing.latestInvoiceNumber = cleanInvoice;
        }
      }
    }

    const companies = Array.from(companyMap.values());

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching active companies:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
