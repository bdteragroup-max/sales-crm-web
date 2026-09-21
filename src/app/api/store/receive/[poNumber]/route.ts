import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { syncSupplierPaymentsForPO } from '@/app/actions/supplierPayment';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ poNumber: string }> }) {
  try {
    const resolvedParams = await params;
    const { poNumber } = resolvedParams;
    const body = await req.json();
    const {
      receivedBy,
      receivedAt,
      deliveryNoteNumber,
      isCompleteDelivery = true,
      note,
      items
    } = body;

    if (!receivedBy) {
      return NextResponse.json({ error: 'Missing receivedBy' }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber }
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    const receiveDate = receivedAt ? new Date(receivedAt) : new Date();
    const isComplete = Boolean(isCompleteDelivery);

    // Calculate next sequence number for this PO's goods receipts
    const lastGR = await prisma.goodsReceipt.findFirst({
      where: { poNumber },
      orderBy: { sequenceNo: 'desc' },
      select: { sequenceNo: true }
    });
    const nextSeq = (lastGR?.sequenceNo ?? 0) + 1;

    // Determine company prefix from poNumber
    const upper = poNumber.toUpperCase();
    const company = upper.includes('-E') ? 'TE' : upper.includes('-P') ? 'TP' : upper.includes('-G') ? 'TG' : null;

    // Summarize quantities if line items are provided
    let deliveredQtySum: number | null = null;
    let orderedQtySum: number | null = null;
    let itemPayload: string | null = po.itemList || null;

    if (Array.isArray(items) && items.length > 0) {
      deliveredQtySum = items.reduce((sum: number, it: any) => sum + (Number(it.receivedQty) || 0), 0);
      orderedQtySum = items.reduce((sum: number, it: any) => sum + (Number(it.orderedQty) || 0), 0);
      itemPayload = JSON.stringify(items);
    }

    // Create the GoodsReceipt entry for audit trail and 3-way match
    const createdGR = await prisma.goodsReceipt.create({
      data: {
        poNumber,
        sequenceNo: nextSeq,
        company,
        recordedAt: new Date(),
        receivedAt: receiveDate,
        recipient: receivedBy,
        deliveryNoteNumber: deliveryNoteNumber || null,
        isCompleteDelivery: isComplete,
        isIncompleteDelivery: !isComplete,
        status: isComplete ? 'COMPLETE' : 'PARTIAL',
        item: itemPayload,
        deliveredQuantity: deliveredQtySum,
        quantity: orderedQtySum
      }
    });

    // Update PurchaseOrder status
    const updated = await prisma.purchaseOrder.update({
      where: { poNumber },
      data: {
        receiveStatus: isComplete ? 'Received' : 'Partial',
        receivedBy,
        receivedAt: receiveDate,
        ...(note && note.trim()
          ? {
              note: po.note
                ? `${po.note}\n[ตรวจรับงวดที่ ${nextSeq}]: ${note.trim()}`
                : `[ตรวจรับงวดที่ ${nextSeq}]: ${note.trim()}`
            }
          : {})
      },
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
      }
    });

    // Trigger AP 3-Way Match synchronization in background
    syncSupplierPaymentsForPO(poNumber).catch(e =>
      console.error('Error syncing AP on store receive:', e)
    );

    // Format response
    const serializedData = {
      ...updated,
      totalAmount: updated.totalAmount ? Number(updated.totalAmount) : null,
      depositAmount: updated.depositAmount ? Number(updated.depositAmount) : null,
      remainingAmount: updated.remainingAmount ? Number(updated.remainingAmount) : null,
      payment1: updated.payment1 ? Number(updated.payment1) : null,
      projectName: updated.purchaseRequest?.projectName || updated.jobName || '-',
      prRequestedBy: updated.purchaseRequest?.requestedBy || null,
      goodsReceipts: updated.goodsReceipts.map(gr => ({
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
      }))
    };

    return NextResponse.json({
      success: true,
      data: serializedData,
      goodsReceipt: {
        ...createdGR,
        quantity: createdGR.quantity ? Number(createdGR.quantity) : null,
        deliveredQuantity: createdGR.deliveredQuantity ? Number(createdGR.deliveredQuantity) : null,
        totalAmount: createdGR.totalAmount ? Number(createdGR.totalAmount) : null,
        receivedAt: createdGR.receivedAt ? createdGR.receivedAt.toISOString() : null,
      }
    });
  } catch (error: any) {
    console.error('Store receive error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
