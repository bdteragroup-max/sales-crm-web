import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), 'find_contact.js');
    const result = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
