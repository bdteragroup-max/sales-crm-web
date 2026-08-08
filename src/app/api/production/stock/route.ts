import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

// GET: Fetch Produce-to-Stock orders
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: { isProduceToStock: true },
      orderBy: { createdAt: 'desc' },
      include: {
        statusLogs: true,
        purchaseRequests: {
          include: {
            purchaseOrders: true
          }
        }
      }
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching stock orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new Produce-to-Stock order
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { productName, quantity, expectedCompletionDate } = data;

    if (!productName || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique order number for Stock Production
    const count = await prisma.order.count({ where: { isProduceToStock: true } });
    const orderNumber = `STK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
    const generatedProductCode = `PRD-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'รอยืนยัน',
        isProduceToStock: true,
        stockItems: {
          productName,
          productCode: generatedProductCode,
          quantity: Number(quantity)
        },
        targetDeliveryDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
      }
    });

    await prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        userId: user.id,
        fromStatus: 'CREATED',
        toStatus: 'รอยืนยัน'
      }
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating stock order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
