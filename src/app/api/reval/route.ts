import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  revalidatePath('/marketing', 'page');
  revalidatePath('/marketing/[id]', 'page');
  revalidatePath('/sales/leads', 'page');
  revalidatePath('/telesales', 'page');
  return NextResponse.json({ revalidated: true });
}
