/**
 * Thailand (Asia/Bangkok, UTC+7) Date & Time Utilities
 */

/**
 * Returns datetime formatted as YYYY-MM-DDTHH:mm in Asia/Bangkok timezone.
 * Used for <input type="datetime-local" /> default values.
 */
export function getBangkokDatetimeString(d: Date | string | number = new Date()): string {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (!date || isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  let hour = getPart("hour");
  if (hour === "24") hour = "00";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${hour}:${getPart("minute")}`;
}

/**
 * Returns date formatted as YYYY-MM-DD in Asia/Bangkok timezone.
 * Used for <input type="date" /> default values.
 */
export function getBangkokDateString(d: Date | string | number = new Date()): string {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (!date || isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

/**
 * Formats a date into a Thai readable string with date and time:
 * e.g. "31 ต.ค. 2569 15:27 น."
 */
export function formatThaiDateTime(
  d: Date | string | number | null | undefined,
  includeTime: boolean = true
): string {
  if (!d) return "-";
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = false;
  }

  const formatted = new Intl.DateTimeFormat("th-TH", options).format(date);
  return includeTime ? `${formatted} น.` : formatted;
}

/**
 * Formats a date into a Thai date string without time:
 * e.g. "31 ต.ค. 2569"
 */
export function formatThaiDate(d: Date | string | number | null | undefined): string {
  return formatThaiDateTime(d, false);
}

/**
 * Parses a date or datetime string into a Date object, ensuring that if no timezone
 * offset is specified, it treats it as Asia/Bangkok (+07:00).
 */
export function parseThaiDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) return null;
  const str = dateStr.trim();

  // If string already has Z or explicit timezone offset (+XX:XX or -XX:XX), parse directly
  if (str.includes("Z") || /[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // If string is YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    const withSec = str.length === 16 ? `${str}:00` : str;
    const d = new Date(`${withSec}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // If string is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

