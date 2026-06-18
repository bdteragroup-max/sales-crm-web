import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const latest = await prisma.repairOrder.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(latest?.checklistImages || { msg: "No images found" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
