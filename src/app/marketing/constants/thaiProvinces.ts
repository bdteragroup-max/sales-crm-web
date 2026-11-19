import { THAI_PROVINCES } from '@/constants/provinces';

export interface ProvinceCountOption {
  province: string;
  count: number;
}

/**
 * Collect distinct provinces present on leads along with their item counts,
 * plus the count of leads without a province.
 */
export function collectLeadProvinceStats(
  leads: ReadonlyArray<{ province?: string | null }>
): { options: ProvinceCountOption[]; unspecifiedCount: number } {
  const counts = new Map<string, number>();
  let unspecifiedCount = 0;

  for (const lead of leads) {
    const trimmed = (lead.province || '').trim();
    if (!trimmed) {
      unspecifiedCount += 1;
      continue;
    }
    counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
  }

  const options = Array.from(counts.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => a.province.localeCompare(b.province, 'th'));

  return { options, unspecifiedCount };
}

/** Match a lead's province against a filter value (`''` = all, `'__UNSPECIFIED__'` = blank). */
export function matchesProvinceFilter(
  leadProvince: string | null | undefined,
  filterValue: string
): boolean {
  if (!filterValue) return true;
  const trimmed = (leadProvince || '').trim();
  if (filterValue === '__UNSPECIFIED__') return trimmed.length === 0;
  return trimmed.toLowerCase() === filterValue.trim().toLowerCase();
}

/** Build select options combining the standard 77 Thai provinces with any existing custom value. */
export function getProvinceSelectOptions(currentValue?: string | null): string[] {
  const trimmed = (currentValue || '').trim();
  if (trimmed && !THAI_PROVINCES.includes(trimmed)) {
    return [trimmed, ...THAI_PROVINCES];
  }
  return THAI_PROVINCES;
}

export interface ProvinceComboboxOption {
  value: string;
  label: string;
  count?: number;
}

/** Build searchable combobox options with lead counts for filter bars. */
export function toProvinceFilterOptions(
  leads: ReadonlyArray<{ province?: string | null }>
): ProvinceComboboxOption[] {
  const { options, unspecifiedCount } = collectLeadProvinceStats(leads);
  const result: ProvinceComboboxOption[] = options.map((opt) => ({
    value: opt.province,
    label: opt.province,
    count: opt.count,
  }));
  if (unspecifiedCount > 0) {
    result.push({
      value: '__UNSPECIFIED__',
      label: 'ไม่ระบุจังหวัด',
      count: unspecifiedCount,
    });
  }
  return result;
}

/** Build searchable combobox options for create/edit lead forms. */
export function toProvinceFormOptions(
  currentValue?: string | null
): ProvinceComboboxOption[] {
  return getProvinceSelectOptions(currentValue).map((prov) => ({
    value: prov,
    label: prov,
  }));
}

/** Filter combobox options by case-insensitive substring query. */
export function filterProvinceComboboxOptions(
  options: ReadonlyArray<ProvinceComboboxOption>,
  query: string
): ProvinceComboboxOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
  );
}
