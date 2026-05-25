import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        companyName: true,
        address: true,
        billingAddress: true,
      },
      orderBy: {
        companyName: 'asc',
      }
    });
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
