/**
 * Thai Buddhist Era (BE) & Common Era (CE) Date Utilities
 * 
 * Prevents double-conversion bugs where year BE (e.g. 2569) is saved as CE,
 * resulting in 2569 + 543 = 3112 when formatted with toLocaleDateString('th-TH').
 */

/**
 * Normalizes any date value to Common Era (CE / AD).
 * If year > 2400 (e.g. 2569 BE), subtracts 543 to get 2026 CE.
 */
export function normalizeDateToCE(dateInput: any): Date | null {
  if (!dateInput) return null;
  
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    
    // Check YYYY-MM-DD
    const parts = trimmed.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      let year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        if (year > 2400) {
          year -= 543;
        }
        return new Date(Date.UTC(year, month, day));
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  if (d.getFullYear() > 2400) {
    d.setFullYear(d.getFullYear() - 543);
  }
  return d;
}

/**
 * Parses value from <input type="date"> (which is YYYY-MM-DD).
 * If the user typed or browser submitted a BE year (> 2400), adjusts to CE.
 */
export function parseDateInput(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const normalized = normalizeDateToCE(dateStr);
  return normalized || undefined;
}

/**
 * Formats a Date object or ISO string to YYYY-MM-DD suitable for <input type="date"> value.
 * Always outputs CE year (e.g. 2026-05-13) so browsers can properly render BE/CE depending on locale.
 */
export function formatDateForInput(dateInput: any): string {
  if (!dateInput) return '';
  const d = normalizeDateToCE(dateInput);
  if (!d) return '';
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely formats a date for display in Thai locale (Buddhist Era).
 * If the stored date already has year > 2400, prevents double-adding 543 (which results in year 3112).
 */
export function formatThaiDate(
  dateInput: any,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  const d = normalizeDateToCE(dateInput);
  if (!d) return '-';

  return d.toLocaleDateString('th-TH', options);
}
