import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repairOrder = await prisma.repairOrder.findUnique({
      where: { jobId: id }
    });

    if (repairOrder) {
      return NextResponse.redirect(new URL(`/repair-orders/${repairOrder.id}/edit`, request.url));
    } else {
      return NextResponse.redirect(new URL(`/repair-orders/new?jobId=${id}`, request.url));
    }
  } catch (error) {
    console.error('Error in manage-repair-order redirect:', error);
    return NextResponse.redirect(new URL('/jobs', request.url));
  }
}
