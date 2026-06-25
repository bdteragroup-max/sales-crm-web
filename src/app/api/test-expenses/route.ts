import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const expenses = await prisma.branchExpense.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: { salesperson: { select: { fullName: true } } }
  });
  return NextResponse.json({ expenses });
}
