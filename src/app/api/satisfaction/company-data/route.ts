import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getCycleDateRange, getQuotationCycleWhere, resolveInstallationStatusBatch } from '@/app/lib/satisfactionServerHelper';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const round = searchParams.get('round');
  const year = searchParams.get('year');

  if (!companyId || !round || !year) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { startDate, endDate } = getCycleDateRange(year, round);

  try {
    const quotations = await prisma.quotation.findMany({
      where: {
        companyId,
        NOT: {
          OR: [
            { status: { startsWith: 'ปฏิเสธ' } },
            { status: { startsWith: 'ยกเลิก' } },
            { status: { in: ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'] } }
          ]
        },
        ...getQuotationCycleWhere(startDate, endDate)
      },
      include: {
        jobs: {
          include: {
            installationOrders: true,
            project: true
          }
        },
        contact: true,
        salesperson: { select: { fullName: true } }
      },
      orderBy: [
        { billingDate: 'desc' },
        { poDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const closedStatuses = ["เปิดบิลแล้ว", "PO แล้วรอเงินโอน", "PO แล้วรอสินค้า"];

    const enrichedQuotations = quotations.map(q => {
      const cleanPo = q.poNumber?.trim() || null;
      const cleanInvoice = q.invoiceNumber?.trim() || null;
      const isRejected = q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก') || ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'].includes(q.status);
      const isClosed = !isRejected && (closedStatuses.includes(q.status) || !!cleanPo || !!q.billingDate);
      return {
        ...q,
        poNumber: cleanPo,
        invoiceNumber: cleanInvoice,
        isClosedSale: isClosed
      };
    });

    const closedQuotations = enrichedQuotations.filter(q => q.isClosedSale);
    const openQuotations = enrichedQuotations.filter(q => !q.isClosedSale);

    const productSummary = enrichedQuotations.flatMap(q => {
      if (q.jobs && q.jobs.length > 0) {
        return q.jobs.map(j => ({
          quotationNumber: q.quotationNumber,
          item: j.item,
          jobType: j.jobType,
          isClosedSale: q.isClosedSale,
          poNumber: q.poNumber,
          invoiceNumber: q.invoiceNumber,
          status: q.status,
          billingDate: q.billingDate,
          poDate: q.poDate
        }));
      }
      
      // Fallback if no jobs exist for the quotation
      return [{
        quotationNumber: q.quotationNumber,
        item: q.subject || q.productType || 'Unknown Item',
        jobType: q.productType || 'N/A',
        isClosedSale: q.isClosedSale,
        poNumber: q.poNumber,
        invoiceNumber: q.invoiceNumber,
        status: q.status,
        billingDate: q.billingDate,
        poDate: q.poDate
      }];
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true
          }
        }
      }
    });

    // Merge and deduplicate contacts from company records and quotation relations
    const contactsMap = new Map<string, any>();
    if (company?.contacts) {
      for (const c of company.contacts) {
        if (c.contactName) contactsMap.set(c.contactName.trim().toLowerCase(), c);
      }
    }
    for (const q of enrichedQuotations) {
      if (q.contact?.contactName) {
        const key = q.contact.contactName.trim().toLowerCase();
        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            id: q.contact.id,
            contactName: q.contact.contactName,
            position: q.contact.position,
            mobilePhone: q.contact.mobilePhone,
            email: q.contact.email
          });
        }
      }
    }
    const allContacts = Array.from(contactsMap.values());

    const defaultContact = closedQuotations.find(q => q.contact?.contactName)?.contact 
      || quotations.find(q => q.contact?.contactName)?.contact 
      || allContacts[0] 
      || null;
    const defaultContactName = defaultContact?.contactName || null;
    const defaultPhone = defaultContact?.mobilePhone || null;

    const latestPoNumber = closedQuotations.find(q => q.poNumber)?.poNumber || null;
    const latestInvoiceNumber = closedQuotations.find(q => q.invoiceNumber)?.invoiceNumber || null;
    const latestClosedDate = closedQuotations[0]?.billingDate || closedQuotations[0]?.poDate || closedQuotations[0]?.quotationDate || null;
    const latestQuotationNumber = closedQuotations[0]?.quotationNumber || quotations[0]?.quotationNumber || null;
    const closedStatus = closedQuotations[0]?.status || (quotations[0]?.status ?? null);
    const totalClosedAmount = closedQuotations.reduce((sum, q) => sum + (q.actualClosingAmount ?? q.totalAmountBeforeVat ?? 0), 0);
    const salespersonName = closedQuotations[0]?.salesperson?.fullName || quotations[0]?.salesperson?.fullName || null;

    const allQuotationNumbers = enrichedQuotations.map(q => q.quotationNumber).filter((n): n is string => Boolean(n));
    const installStatusMap = await resolveInstallationStatusBatch([{
      companyId,
      companyName: company?.companyName || null,
      quotationNumbers: allQuotationNumbers
    }]);

    const installationStatus = installStatusMap.get(companyId) || {
      status: 'UNKNOWN',
      label: 'ไม่มีข้อมูลงานติดตั้ง',
      badgeText: 'ไม่มีงานติดตั้ง',
      color: 'gray'
    };

    return NextResponse.json({
      quotations: enrichedQuotations,
      closedQuotations,
      openQuotations,
      productSummary,
      contacts: allContacts,
      defaultContactName,
      defaultPhone,
      isClosedSale: closedQuotations.length > 0,
      latestPoNumber,
      latestInvoiceNumber,
      latestClosedDate,
      latestQuotationNumber,
      closedStatus,
      totalClosedAmount,
      salespersonName,
      installationStatus
    });
  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
