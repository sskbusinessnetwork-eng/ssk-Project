import { format as originalFormat, isValid } from 'date-fns';

/**
 * Universal safe date parser that supports ISO strings, timestamps, Date objects,
 * and DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD formats across all browsers.
 */
export function parseSafeDate(input: any): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') {
      return null;
    }

    // Check DD-MM-YYYY or DD/MM/YYYY (e.g. 23-08-2026, 09/08/2026, 14-08-2026 10:30:00)
    const ddMmMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ddMmMatch) {
      const day = parseInt(ddMmMatch[1], 10);
      const month = parseInt(ddMmMatch[2], 10) - 1;
      const year = parseInt(ddMmMatch[3], 10);
      const hour = ddMmMatch[4] ? parseInt(ddMmMatch[4], 10) : 0;
      const min = ddMmMatch[5] ? parseInt(ddMmMatch[5], 10) : 0;
      const sec = ddMmMatch[6] ? parseInt(ddMmMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }

    // Check YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-08-23, 2026/08/23)
    const yyyyMmMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (yyyyMmMatch) {
      const year = parseInt(yyyyMmMatch[1], 10);
      const month = parseInt(yyyyMmMatch[2], 10) - 1;
      const day = parseInt(yyyyMmMatch[3], 10);
      const hour = yyyyMmMatch[4] ? parseInt(yyyyMmMatch[4], 10) : 0;
      const min = yyyyMmMatch[5] ? parseInt(yyyyMmMatch[5], 10) : 0;
      const sec = yyyyMmMatch[6] ? parseInt(yyyyMmMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }

    // ISO string or standard browser parse
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;
  }
  return null;
}

export const safeFormat = (date: any, formatStr: string, options?: any): string => {
  if (!date) return 'N/A';
  const d = parseSafeDate(date);
  if (!d) return 'N/A';
  try {
    return originalFormat(d, formatStr, options);
  } catch {
    return 'N/A';
  }
};

export function safeFormatDate(dateValue: string | Date | number | null | undefined, formatStr: string, fallback: string = 'N/A'): string {
  if (!dateValue) return fallback;
  const d = parseSafeDate(dateValue);
  if (!d) return fallback;
  try {
    return originalFormat(d, formatStr);
  } catch {
    return fallback;
  }
}

