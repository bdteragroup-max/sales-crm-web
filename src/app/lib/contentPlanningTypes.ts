export const CONTENT_PLANNING_CHANNELS = [
  'Facebook',
  'YouTube',
  'TikTok',
  'LINE',
  'Instagram',
] as const;

export type ContentPlanningChannel = (typeof CONTENT_PLANNING_CHANNELS)[number];

export const CONTENT_PLAN_CHANNEL_STYLE: Record<
  ContentPlanningChannel,
  {
    badge: string;
    activeBtn: string;
    shortLabel: string;
    dot: string;
  }
> = {
  Facebook: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    activeBtn: 'bg-blue-600 text-white border-blue-700',
    shortLabel: 'FB',
    dot: 'bg-blue-500',
  },
  YouTube: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    activeBtn: 'bg-red-600 text-white border-red-700',
    shortLabel: 'YT',
    dot: 'bg-red-500',
  },
  TikTok: {
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    activeBtn: 'bg-slate-900 text-white border-slate-900',
    shortLabel: 'TT',
    dot: 'bg-slate-800',
  },
  LINE: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeBtn: 'bg-emerald-600 text-white border-emerald-700',
    shortLabel: 'LINE',
    dot: 'bg-emerald-500',
  },
  Instagram: {
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    activeBtn: 'bg-fuchsia-600 text-white border-fuchsia-700',
    shortLabel: 'IG',
    dot: 'bg-fuchsia-500',
  },
};

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export interface MarketingPlanMember {
  userId: string;
  employeeId: string;
  fullName: string;
  nickname?: string | null;
  role: string;
  position?: string | null;
  isMarketingManager: boolean;
  isActive: boolean;
}

export interface ContentPlanCoOwnerItem {
  userId: string;
  userName: string;
  employeeId?: string | null;
}

export interface ContentPlanItem {
  id: string;
  planYear: number;
  planMonth: number;
  primaryOwnerId: string;
  primaryOwnerName: string;
  title: string;
  contentDetail: string | null;
  caption: string | null;
  postDate: string;
  postTime: string | null;
  channels: ContentPlanningChannel[];
  coOwners: ContentPlanCoOwnerItem[];
  createdById: string;
  createdByName: string;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlanningPermissions {
  userId: string;
  userName: string;
  employeeId: string | null;
  role: string;
  roleLabel: string;
  canAccess: boolean;
  canCreate: boolean;
  canManageAll: boolean;
  isReadOnly: boolean;
}

export function formatThaiMonthYear(yearCe: number, month1Based: number): string {
  const monthName = THAI_MONTH_NAMES[month1Based - 1] || `เดือน ${month1Based}`;
  return `${monthName} ${yearCe + 543}`;
}

export function formatShortThaiDate(postDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate)) return postDate || '-';
  const [yStr, mStr, dStr] = postDate.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return postDate;
  return dt.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * Formats ISO `YYYY-MM-DD` to Thai `DD/MM/YYYY` (B.E.), e.g. `2026-11-25` -> `25/11/2569`.
 */
export function formatIsoDateToSlashThai(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '';
  const [yStr, mStr, dStr] = isoDate.split('-');
  const yearCe = Number(yStr);
  if (!Number.isFinite(yearCe)) return isoDate;
  return `${dStr}/${mStr}/${yearCe + 543}`;
}

/**
 * Parses Thai/CE `DD/MM/YYYY` (e.g. `25/11/2569`, `25/11/2026`, `25-11-2569`) or `YYYY-MM-DD` into canonical `YYYY-MM-DD`.
 */
export function parseSlashDateToIso(raw: string): string | null {
  const clean = (raw || '').trim();
  if (!clean) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [yStr, mStr, dStr] = clean.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() + 1 === m &&
      probe.getUTCDate() === d
    ) {
      return clean;
    }
    return null;
  }

  const m = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const rawYear = Number(m[3]);
  const yearCe =
    rawYear < 100
      ? rawYear >= 40
        ? 2500 + rawYear - 543
        : 2000 + rawYear
      : rawYear >= 2400
      ? rawYear - 543
      : rawYear;

  if (yearCe < 1900 || yearCe > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(Date.UTC(yearCe, month - 1, day));
  if (
    probe.getUTCFullYear() !== yearCe ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(yearCe).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formats canonical `HH:mm` or `HH.mm` time into 24-hour `HH.mm` display (`00.00` - `23.59`).
 */
export function formatTime24Dot(rawTime?: string | null): string {
  const clean = (rawTime || '').trim();
  if (!clean) return '';
  const parsed = parseTime24Input(clean);
  if (!parsed.ok || !parsed.time24) return clean;
  return parsed.time24.replace(':', '.');
}

/**
 * Parses 24-hour time inputs (`00.00` - `23.59`, `00:00` - `23:59`, `2359`, `9.30`) into canonical `HH:mm`.
 */
export function parseTime24Input(
  raw?: string | null
): { ok: true; time24: string | null } | { ok: false; error: string } {
  const stripped = (raw || '')
    .replace(/น\.?/g, '')
    .trim();
  if (!stripped) {
    return { ok: true, time24: null };
  }

  let hour = -1;
  let minute = -1;

  const sepMatch = stripped.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (sepMatch) {
    hour = Number(sepMatch[1]);
    minute = Number(sepMatch[2]);
  } else if (/^\d{4}$/.test(stripped)) {
    hour = Number(stripped.slice(0, 2));
    minute = Number(stripped.slice(2, 4));
  } else if (/^\d{3}$/.test(stripped)) {
    hour = Number(stripped.slice(0, 1));
    minute = Number(stripped.slice(1, 3));
  } else {
    return {
      ok: false,
      error: 'กรุณาระบุเวลาโพสต์รูปแบบ 24 ชม. (เช่น 00.00 - 23.59)',
    };
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      ok: false,
      error: 'เวลาโพสต์ต้องอยู่ระหว่าง 00.00 ถึง 23.59 น.',
    };
  }

  return {
    ok: true,
    time24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function normalizePostDateAndTime(
  postDate: string,
  postTime?: string | null
):
  | { ok: true; postDate: string; postTime: string | null; planYear: number; planMonth: number }
  | { ok: false; error: string } {
  const isoDate = parseSlashDateToIso(postDate);
  if (!isoDate) {
    return { ok: false, error: 'กรุณาระบุวันที่โพสต์ให้ถูกต้อง (วัน/เดือน/ปี)' };
  }

  const [yStr, mStr] = isoDate.split('-');
  const planYear = Number(yStr);
  const planMonth = Number(mStr);

  const timeCheck = parseTime24Input(postTime);
  if (!timeCheck.ok) {
    return { ok: false, error: timeCheck.error };
  }

  return {
    ok: true,
    postDate: isoDate,
    postTime: timeCheck.time24,
    planYear,
    planMonth,
  };
}

export function sanitizeContentPlanChannels(raw: unknown): ContentPlanningChannel[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(CONTENT_PLANNING_CHANNELS);
  const unique: ContentPlanningChannel[] = [];
  for (const ch of raw) {
    if (typeof ch === 'string' && allowed.has(ch) && !unique.includes(ch as ContentPlanningChannel)) {
      unique.push(ch as ContentPlanningChannel);
    }
  }
  return unique;
}

/**
 * Checks whether the current user can edit/delete a specific content plan row:
 * - Marketing Manager / Super Admin (`canManageAll`) can edit/delete any sheet
 * - Marketing team members can edit/delete rows where they are Primary Owner or Co-Owner
 */
export function canUserModifyContentPlan(
  item: Pick<ContentPlanItem, 'primaryOwnerId' | 'coOwners'>,
  permissions: Pick<ContentPlanningPermissions, 'userId' | 'canManageAll' | 'isReadOnly'> | null
): boolean {
  if (!permissions || permissions.isReadOnly) return false;
  if (permissions.canManageAll) return true;
  if (item.primaryOwnerId === permissions.userId) return true;
  return (item.coOwners || []).some(co => co.userId === permissions.userId);
}

/**
 * Returns true if a plan item belongs inside the given Marketing member's individual sheet
 * (either as Primary Owner or Co-Owner).
 */
export function doesPlanBelongToMemberSheet(
  item: Pick<ContentPlanItem, 'primaryOwnerId' | 'coOwners'>,
  memberUserId: string
): boolean {
  if (item.primaryOwnerId === memberUserId) return true;
  return (item.coOwners || []).some(co => co.userId === memberUserId);
}

export function sortContentPlansChronologically<
  T extends Pick<ContentPlanItem, 'postDate' | 'postTime' | 'createdAt'>,
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateCmp = a.postDate.localeCompare(b.postDate);
    if (dateCmp !== 0) return dateCmp;
    const tA = a.postTime || '99:99';
    const tB = b.postTime || '99:99';
    const timeCmp = tA.localeCompare(tB);
    if (timeCmp !== 0) return timeCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function filterMarketingPlanMembers(
  members: MarketingPlanMember[],
  query: string
): MarketingPlanMember[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return members;
  return members.filter(m =>
    [m.fullName, m.nickname || '', m.employeeId, m.position || '', m.role]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
}
