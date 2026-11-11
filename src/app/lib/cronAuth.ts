/**
 * Shared authorization and Bangkok timezone date helpers for Cron routes.
 */

export function isAuthorizedCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  // When CRON_SECRET is configured, strictly validate Bearer token or x-cron-secret
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret;
  }

  // When CRON_SECRET is not configured in environment variables:
  // Allow Vercel Cron scheduler requests (`vercel-cron/*` / `x-vercel-cron: 1`) and local loopback execution
  const userAgent = request.headers.get('user-agent') || '';
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const host = request.headers.get('host') || '';

  if (
    userAgent.startsWith('vercel-cron/') ||
    vercelCronHeader === '1' ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the target { month, year } (1-indexed month) to evaluate for monthly gold.
 * Supports explicit `?month=10&year=2026` query parameters on authorized calls,
 * otherwise defaults to the previous calendar month relative to Asia/Bangkok (UTC+7)
 * when run on the 1st, or the previous day's month in Asia/Bangkok.
 */
export function getTargetPreviousMonthBangkok(request?: Request): { month: number; year: number } {
  if (request) {
    try {
      const { searchParams } = new URL(request.url);
      const qMonth = Number(searchParams.get('month'));
      const qYear = Number(searchParams.get('year'));
      if (Number.isInteger(qMonth) && qMonth >= 1 && qMonth <= 12 && Number.isInteger(qYear) && qYear >= 2024) {
        return { month: qMonth, year: qYear };
      }
    } catch {
      // Ignore malformed URL and fall back to Bangkok clock
    }
  }

  return getPreviousCalendarMonthBangkok();
}

/**
 * Always returns the immediately preceding completed calendar month in Asia/Bangkok (UTC+7).
 * Example: On any day in November 2026 (2026-11-01 through 2026-11-30 Bangkok time), returns { month: 10, year: 2026 }.
 */
export function getPreviousCalendarMonthBangkok(now: Date = new Date()): { month: number; year: number; monthKey: string } {
  const bkkParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);

  const curYear = Number(bkkParts.find((p) => p.type === 'year')?.value || now.getUTCFullYear());
  const curMonth = Number(bkkParts.find((p) => p.type === 'month')?.value || now.getUTCMonth() + 1);

  const month = curMonth === 1 ? 12 : curMonth - 1;
  const year = curMonth === 1 ? curYear - 1 : curYear;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  return { month, year, monthKey };
}

