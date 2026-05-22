import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = execSync('git log -p -2 -- "src/app/clients/page.tsx"', { encoding: 'utf-8' });
    return NextResponse.json({ history: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
