import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

// PUT: Update an existing Produce-to-Stock order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const data = await request.json();
    const { productName, quantity, expectedCompletionDate } = data;

    if (!productName || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!existingOrder || !existingOrder.isProduceToStock) {
      return NextResponse.json({ error: 'Stock order not found' }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        stockItems: {
          ...(existingOrder.stockItems as any || {}),
          productName,
          quantity: Number(quantity)
        },
        targetDeliveryDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
      }
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating stock order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a Produce-to-Stock order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    
    // First verify it's a produce-to-stock order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!existingOrder || !existingOrder.isProduceToStock) {
      return NextResponse.json({ error: 'Stock order not found' }, { status: 404 });
    }

    // Delete associated status logs first
    await prisma.orderStatusLog.deleteMany({
      where: { orderId }
    });

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting stock order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
