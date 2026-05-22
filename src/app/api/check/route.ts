import { NextResponse } from 'next/server';
import { teraDb } from '@/app/lib/teraDb';

export async function GET() {
  try {
    const envs = {
      DATABASE_URL: process.env.DATABASE_URL,
      TERA_DB_URL: process.env.TERA_DB_URL
    };
    return NextResponse.json({ envs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

