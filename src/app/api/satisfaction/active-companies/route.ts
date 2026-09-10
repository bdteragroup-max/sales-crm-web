import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getCycleDateRange, getQuotationCycleWhere, resolveInstallationStatusBatch } from '@/app/lib/satisfactionServerHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const round = searchParams.get('round');
  const year = searchParams.get('year');
  const method = searchParams.get('method');

  if (!round || !year) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { startDate, endDate } = getCycleDateRange(year, round);

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
          getQuotationCycleWhere(startDate, endDate)
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

    // Find companies that have already been evaluated in this round/year
    const existingSurveys = await prisma.customerSatisfaction.findMany({
      where: {
        surveyRound: parseInt(round),
        surveyYear: parseInt(year)
      },
      select: { companyId: true }
    });
    const evaluatedCompanyIds = new Set(existingSurveys.map(s => s.companyId).filter(Boolean));

    // Aggregate by companyId with closed-sale metadata & PO reference
    const companyMap = new Map<string, any>();
    const companyQuotesMap = new Map<string, string[]>();

    for (const q of quotations) {
      if (!q.company || evaluatedCompanyIds.has(q.company.id)) continue;
      
      const effectiveClosedDate = q.billingDate || q.poDate || q.quotationDate;
      if (!effectiveClosedDate) continue;
      const effD = new Date(effectiveClosedDate);
      if (effD < startDate || effD > endDate) continue;

      const cleanPo = q.poNumber?.trim() || null;
      const cleanInvoice = q.invoiceNumber?.trim() || null;
      const isRejected = q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก') || ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'].includes(q.status);
      const isClosed = !isRejected && (closedStatuses.includes(q.status) || !!cleanPo || !!q.billingDate);

      const contactName = q.contact?.contactName || q.company.contacts?.[0]?.contactName || null;
      const contactPhone = q.contact?.mobilePhone || q.company.contacts?.[0]?.mobilePhone || null;

      if (!companyQuotesMap.has(q.companyId)) {
        companyQuotesMap.set(q.companyId, []);
      }
      if (q.quotationNumber) {
        companyQuotesMap.get(q.companyId)!.push(q.quotationNumber);
      }

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
          latestClosedDate: effectiveClosedDate,
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

    // Resolve installation status for all active companies in batch
    const companies = Array.from(companyMap.values());
    const batchItems = companies.map(c => ({
      companyId: c.id,
      companyName: c.companyName,
      quotationNumbers: companyQuotesMap.get(c.id) || []
    }));

    const installStatusMap = await resolveInstallationStatusBatch(batchItems);

    for (const c of companies) {
      c.installationStatus = installStatusMap.get(c.id) || {
        status: 'UNKNOWN',
        label: 'ไม่มีข้อมูลงานติดตั้ง',
        badgeText: 'ไม่มีงานติดตั้ง',
        color: 'gray'
      };
    }

    return NextResponse.json({
      companies,
      evaluatedCompanyIds: Array.from(evaluatedCompanyIds)
    });
  } catch (error) {
    console.error('Error fetching active companies:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
