import { deleteSession } from '@/app/lib/session';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  await deleteSession();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
