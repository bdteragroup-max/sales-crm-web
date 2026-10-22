import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // 'all' | 'received' | 'pending'
    const company = searchParams.get('company') || 'ALL'; // 'ALL' | 'TE' | 'TP' | 'TG'
    const search = (searchParams.get('search') || '').trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year'); // e.g. 2026
    const stage = searchParams.get('stage') || 'ALL'; // 'ALL' | 'UNRECEIVED' | 'PARTIAL'
    const urgency = searchParams.get('urgency') || 'ALL'; // 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'

    // Build Company Where Clause
    const buildCompanyCondition = (comp: string) => {
      if (comp === 'TE') return { poNumber: { contains: '-E', mode: 'insensitive' as const } };
      if (comp === 'TP') return { poNumber: { contains: '-P', mode: 'insensitive' as const } };
      if (comp === 'TG') return { poNumber: { contains: '-G', mode: 'insensitive' as const } };
      return {};
    };

    // Build Date Range
    let dateRange: { gte?: Date; lte?: Date } | null = null;
    if (startDate && endDate) {
      dateRange = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (year && year !== 'ALL') {
      const y = parseInt(year, 10);
      if (month && month !== 'ALL') {
        const m = parseInt(month, 10);
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        dateRange = { gte: start, lte: end };
      } else {
        const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
        const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
        dateRange = { gte: start, lte: end };
      }
    } else if (month && month !== 'ALL') {
      const currentYear = new Date().getFullYear();
      const m = parseInt(month, 10);
      const start = new Date(Date.UTC(currentYear, m - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, m, 0, 23, 59, 59, 999));
      dateRange = { gte: start, lte: end };
    }

    // Build Search Condition
    const buildSearchCondition = (q: string) => {
      if (!q) return {};
      return {
        OR: [
          { poNumber: { contains: q, mode: 'insensitive' as const } },
          { prNumber: { contains: q, mode: 'insensitive' as const } },
          { vendorName: { contains: q, mode: 'insensitive' as const } },
          { jobName: { contains: q, mode: 'insensitive' as const } },
          { itemList: { contains: q, mode: 'insensitive' as const } },
          { note: { contains: q, mode: 'insensitive' as const } },
          { receivedBy: { contains: q, mode: 'insensitive' as const } },
          { reportedBy: { contains: q, mode: 'insensitive' as const } },
          {
            purchaseRequest: {
              OR: [
                { projectName: { contains: q, mode: 'insensitive' as const } },
                { requestedBy: { contains: q, mode: 'insensitive' as const } },
              ]
            }
          }
        ]
      };
    };

    const serializeGR = (grs: any[]) =>
      (grs || []).map(gr => ({
        id: gr.id,
        sequenceNo: gr.sequenceNo,
        recordedAt: gr.recordedAt ? gr.recordedAt.toISOString() : null,
        company: gr.company,
        poNumber: gr.poNumber,
        item: gr.item,
        quantity: gr.quantity !== null && gr.quantity !== undefined ? Number(gr.quantity) : null,
        totalAmount: gr.totalAmount !== null && gr.totalAmount !== undefined ? Number(gr.totalAmount) : null,
        creditTerm: gr.creditTerm,
        status: gr.status,
        targetDeliveryDate: gr.targetDeliveryDate ? gr.targetDeliveryDate.toISOString() : null,
        deliveredQuantity: gr.deliveredQuantity !== null && gr.deliveredQuantity !== undefined ? Number(gr.deliveredQuantity) : null,
        receivedAt: gr.receivedAt ? gr.receivedAt.toISOString() : null,
        deliveryNoteNumber: gr.deliveryNoteNumber,
        recipient: gr.recipient,
        isCompleteDelivery: Boolean(gr.isCompleteDelivery),
        isIncompleteDelivery: Boolean(gr.isIncompleteDelivery),
        createdAt: gr.createdAt ? gr.createdAt.toISOString() : null,
      }));

    const serializePO = (po: any) => ({
      ...po,
      totalAmount: po.totalAmount ? Number(po.totalAmount) : null,
      depositAmount: po.depositAmount ? Number(po.depositAmount) : null,
      remainingAmount: po.remainingAmount ? Number(po.remainingAmount) : null,
      payment1: po.payment1 ? Number(po.payment1) : null,
      projectName: po.purchaseRequest?.projectName || po.jobName || '-',
      prRequestedBy: po.purchaseRequest?.requestedBy || null,
      deliveryDate: po.deliveryDate ? po.deliveryDate.toISOString() : null,
      recordedAt: po.recordedAt ? po.recordedAt.toISOString() : null,
      receivedAt: po.receivedAt ? po.receivedAt.toISOString() : null,
      createdAt: po.createdAt ? po.createdAt.toISOString() : null,
      goodsReceipts: serializeGR(po.goodsReceipts),
    });

    let receivedPOs: any[] = [];
    let pendingPOs: any[] = [];

    // 1. Fetch Received POs
    if (type === 'all' || type === 'received') {
      const receivedWhere: any = {
        receiveStatus: 'Received',
        ...buildCompanyCondition(company),
        ...buildSearchCondition(search),
      };

      if (dateRange) {
        receivedWhere.receivedAt = dateRange;
      }

      const rawReceived = await prisma.purchaseOrder.findMany({
        where: receivedWhere,
        include: {
          goodsReceipts: {
            orderBy: { sequenceNo: 'asc' }
          },
          purchaseRequest: {
            select: {
              projectName: true,
              prNumber: true,
              requestedBy: true,
              reportedBy: true
            }
          }
        },
        orderBy: { receivedAt: 'desc' }
      });

      receivedPOs = rawReceived.map(serializePO);
    }

    // 2. Fetch Pending POs
    if (type === 'all' || type === 'pending') {
      const pendingWhere: any = {
        OR: [
          { receiveStatus: null },
          { receiveStatus: { notIn: ['Received', 'Cancelled'] } }
        ],
        ...buildCompanyCondition(company),
        ...buildSearchCondition(search),
      };

      if (stage === 'UNRECEIVED') {
        pendingWhere.receiveStatus = null;
      } else if (stage === 'PARTIAL') {
        pendingWhere.receiveStatus = 'Partial';
      }

      if (dateRange) {
        pendingWhere.deliveryDate = dateRange;
      }

      const rawPending = await prisma.purchaseOrder.findMany({
        where: pendingWhere,
        include: {
          goodsReceipts: {
            orderBy: { sequenceNo: 'asc' }
          },
          purchaseRequest: {
            select: {
              projectName: true,
              prNumber: true,
              requestedBy: true,
              reportedBy: true
            }
          }
        },
        orderBy: { deliveryDate: 'asc' }
      });

      let mappedPending = rawPending.map(serializePO);

      // Client urgency filtering if specified
      if (urgency !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        mappedPending = mappedPending.filter(po => {
          if (!po.deliveryDate) return false;
          const target = new Date(po.deliveryDate);
          target.setHours(0, 0, 0, 0);
          const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (urgency === 'OVERDUE') return diffDays < 0;
          if (urgency === 'TODAY') return diffDays === 0;
          if (urgency === 'UPCOMING') return diffDays > 0 && diffDays <= 7;
          return true;
        });
      }

      pendingPOs = mappedPending;
    }

    // Calculate Summary Metrics
    const totalPendingCount = pendingPOs.length;
    const totalPendingAmount = pendingPOs.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const partialCount = pendingPOs.filter(p => p.receiveStatus === 'Partial').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let dueTodayCount = 0;
    pendingPOs.forEach(p => {
      if (p.deliveryDate) {
        const target = new Date(p.deliveryDate);
        target.setHours(0, 0, 0, 0);
        const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) overdueCount++;
        else if (diff === 0) dueTodayCount++;
      }
    });

    const totalReceivedCount = receivedPOs.length;
    const totalReceivedAmount = receivedPOs.reduce((acc, r) => acc + (r.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        receivedPOs,
        pendingPOs,
        metrics: {
          totalPendingCount,
          totalPendingAmount,
          overdueCount,
          dueTodayCount,
          partialCount,
          totalReceivedCount,
          totalReceivedAmount,
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching receive report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
