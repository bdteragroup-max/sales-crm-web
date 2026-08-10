import { NextResponse } from 'next/server';
import { seedBDWorkflowTemplates } from '@/app/actions/bd';

export async function GET() {
  const result = await seedBDWorkflowTemplates();
  return NextResponse.json(result);
}
