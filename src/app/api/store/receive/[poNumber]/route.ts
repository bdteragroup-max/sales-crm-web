import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ poNumber: string }> }) {
  try {
    const resolvedParams = await params;
    const { poNumber } = resolvedParams;
    const body = await req.json();
    const { receivedBy } = body;

    // TODO: Verify if user has STORE role
    // For now, updating the status as requested
    
    if (!receivedBy) {
      return NextResponse.json({ error: 'Missing receivedBy' }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber }
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { poNumber },
      data: {
        receiveStatus: 'Received',
        receivedBy,
        receivedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Store receive error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
