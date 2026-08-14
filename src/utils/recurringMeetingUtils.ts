import { parseTimeTo24h, formatTime12h } from './timeUtils';

export const TIMEZONE_IST = 'Asia/Kolkata';

export const WEEKDAY_NAMES_MAP: Record<string, number> = {
  sunday: 0, sunday_: 0, sun: 0, '0': 0,
  monday: 1, monday_: 1, mon: 1, '1': 1,
  tuesday: 2, tuesday_: 2, tue: 2, '2': 2,
  wednesday: 3, wednesday_: 3, wed: 3, '3': 3,
  thursday: 4, thursday_: 4, thu: 4, '4': 4,
  friday: 5, friday_: 5, fri: 5, '5': 5,
  saturday: 6, saturday_: 6, sat: 6, '6': 6
};

export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ISTDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number; // 0-23
  minutes: number; // 0-59
  seconds: number;
  weekday: string; // 'Monday', etc.
  weekdayIndex: number; // 0 (Sun) - 6 (Sat)
  dateString: string; // 'YYYY-MM-DD'
  timestampMs: number; // UTC timestamp ms
}

export interface MeetingDateInfo {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  weekday: string;
  weekdayIndex: number;
  dateString: string; // 'YYYY-MM-DD'
  isoWithTimezone: string;
  displayDate: string; // '17 Aug 2026'
  displayFull: string; // 'Monday, 17 Aug 2026'
  displayShort: string; // 'Aug 17, 2026'
  timeFormatted: string; // '07:00 AM'
  timestampMs: number;
}

/**
 * Returns current date and time components strictly in Asia/Kolkata (IST, UTC+05:30)
 */
export function getISTNow(baseDate: Date = new Date()): ISTDateParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE_IST,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'long',
      hour12: false
    });
    const parts = formatter.formatToParts(baseDate);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });

    const h = parseInt(map.hour || '0', 10);
    const hours = h === 24 ? 0 : h;
    const minutes = parseInt(map.minute || '0', 10);
    const seconds = parseInt(map.second || '0', 10);
    const year = parseInt(map.year || '2026', 10);
    const month = parseInt(map.month || '1', 10);
    const day = parseInt(map.day || '1', 10);
    const weekday = map.weekday || 'Monday';
    const weekdayLower = weekday.toLowerCase();
    const weekdayIndex = WEEKDAY_NAMES_MAP[weekdayLower] ?? 0;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timestampMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - (5.5 * 60 * 60 * 1000);

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      weekday,
      weekdayIndex,
      dateString,
      timestampMs
    };
  } catch (e) {
    // Fallback if Intl fails
    const utcTime = baseDate.getTime();
    const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
    const year = istTime.getUTCFullYear();
    const month = istTime.getUTCMonth() + 1;
    const day = istTime.getUTCDate();
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const seconds = istTime.getUTCSeconds();
    const weekdayIndex = istTime.getUTCDay();
    const weekday = WEEKDAY_NAMES_FULL[weekdayIndex];
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timestampMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - (5.5 * 60 * 60 * 1000);

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      weekday,
      weekdayIndex,
      dateString,
      timestampMs
    };
  }
}

/**
 * Universal safe parser that extracts IST meeting date & time components
 * without shifting days across client browser timezones.
 */
export function parseMeetingDateParts(dateVal: any, timeStr: string = '07:30'): MeetingDateInfo | null {
  if (!dateVal) return null;
  let year = 2026;
  let month = 8;
  let day = 1;

  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const ist = getISTNow(d);
      year = ist.year;
      month = ist.month;
      day = ist.day;
    }
  }

  const { hours, minutes } = parseTimeTo24h(timeStr);
  const utcDayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekdayIndex = utcDayDate.getUTCDay();
  const weekday = WEEKDAY_NAMES_FULL[weekdayIndex] || 'Monday';
  const monthName = MONTH_NAMES_SHORT[month - 1] || 'Aug';

  const padDay = String(day).padStart(2, '0');
  const padMonth = String(month).padStart(2, '0');
  const padHours = String(hours).padStart(2, '0');
  const padMinutes = String(minutes).padStart(2, '0');

  const dateString = `${year}-${padMonth}-${padDay}`;
  const isoWithTimezone = `${dateString}T${padHours}:${padMinutes}:00+05:30`;
  const timestampMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - (5.5 * 60 * 60 * 1000);

  return {
    year,
    month,
    day,
    hours,
    minutes,
    weekday,
    weekdayIndex,
    dateString,
    isoWithTimezone,
    displayDate: `${padDay} ${monthName} ${year}`,
    displayFull: `${weekday}, ${padDay} ${monthName} ${year}`,
    displayShort: `${monthName} ${day}, ${year}`,
    timeFormatted: formatTime12h(timeStr || `${padHours}:${padMinutes}`),
    timestampMs
  };
}

/**
 * Calculates the exact next upcoming meeting occurrence based on the recurring rule
 * (source of truth) and current time in Asia/Kolkata (IST).
 * 
 * Rules:
 * 1. Weekly recurring meeting:
 *    - If today is before the configured weekday: occurrence is the next configured weekday.
 *    - If today is the configured weekday and meeting time has NOT passed: occurrence is today's meeting.
 *    - If today is the configured weekday and meeting time HAS passed: occurrence is the next week's configured weekday (+7 days).
 * 2. Monthly recurring meeting:
 *    - If today is before target day of month: occurrence is this month's day.
 *    - If today is target day of month and meeting time has NOT passed: occurrence is today's meeting.
 *    - If target day has passed: occurrence is next month's day (clamped to month's days).
 */
export function calculateNextOccurrence(
  frequency: 'Weekly' | 'Monthly' | string = 'Weekly',
  day: string = 'Monday',
  date: number = 1,
  time: string = '07:00 AM',
  baseDate: Date = new Date()
): MeetingDateInfo {
  const istNow = getISTNow(baseDate);
  const { hours: targetHours, minutes: targetMinutes } = parseTimeTo24h(time || '07:00');

  if (frequency === 'Weekly' || !frequency) {
    const normDay = String(day || 'Monday').trim().toLowerCase();
    const targetDayIndex = WEEKDAY_NAMES_MAP[normDay] !== undefined ? WEEKDAY_NAMES_MAP[normDay] : 1;

    let daysToAdd = (targetDayIndex - istNow.weekdayIndex + 7) % 7;
    if (daysToAdd === 0) {
      const isPastTime = 
        istNow.hours > targetHours ||
        (istNow.hours === targetHours && istNow.minutes >= targetMinutes);
      if (isPastTime) {
        daysToAdd = 7;
      }
    }

    const targetDateUtc = new Date(Date.UTC(istNow.year, istNow.month - 1, istNow.day + daysToAdd, 12, 0, 0));
    const year = targetDateUtc.getUTCFullYear();
    const month = targetDateUtc.getUTCMonth() + 1;
    const dayOfMonth = targetDateUtc.getUTCDate();
    const padMonth = String(month).padStart(2, '0');
    const padDay = String(dayOfMonth).padStart(2, '0');
    const padHours = String(targetHours).padStart(2, '0');
    const padMinutes = String(targetMinutes).padStart(2, '0');

    const dateString = `${year}-${padMonth}-${padDay}`;
    const isoWithTimezone = `${dateString}T${padHours}:${padMinutes}:00+05:30`;
    const weekday = WEEKDAY_NAMES_FULL[targetDayIndex];
    const monthName = MONTH_NAMES_SHORT[month - 1];
    const timestampMs = Date.UTC(year, month - 1, dayOfMonth, targetHours, targetMinutes, 0) - (5.5 * 60 * 60 * 1000);

    return {
      year,
      month,
      day: dayOfMonth,
      weekday,
      weekdayIndex: targetDayIndex,
      dateString,
      isoWithTimezone,
      hours: targetHours,
      minutes: targetMinutes,
      timestampMs,
      displayDate: `${padDay} ${monthName} ${year}`,
      displayFull: `${weekday}, ${padDay} ${monthName} ${year}`,
      displayShort: `${monthName} ${dayOfMonth}, ${year}`,
      timeFormatted: formatTime12h(time || `${padHours}:${padMinutes}`)
    };
  } else {
    // Monthly
    const targetDayOfMonth = Math.max(1, Math.min(31, parseInt(String(date), 10) || 1));
    let targetYear = istNow.year;
    let targetMonth = istNow.month;

    // Days in current month
    const daysInCurrMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const actualDayThisMonth = Math.min(targetDayOfMonth, daysInCurrMonth);

    const isThisMonthPast = 
      istNow.day > actualDayThisMonth ||
      (istNow.day === actualDayThisMonth && (istNow.hours > targetHours || (istNow.hours === targetHours && istNow.minutes >= targetMinutes)));

    if (isThisMonthPast) {
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const finalDay = Math.min(targetDayOfMonth, daysInTargetMonth);
    const padMonth = String(targetMonth).padStart(2, '0');
    const padDay = String(finalDay).padStart(2, '0');
    const padHours = String(targetHours).padStart(2, '0');
    const padMinutes = String(targetMinutes).padStart(2, '0');

    const dateString = `${targetYear}-${padMonth}-${padDay}`;
    const isoWithTimezone = `${dateString}T${padHours}:${padMinutes}:00+05:30`;
    const utcDate = new Date(Date.UTC(targetYear, targetMonth - 1, finalDay, 12, 0, 0));
    const weekday = WEEKDAY_NAMES_FULL[utcDate.getUTCDay()];
    const monthName = MONTH_NAMES_SHORT[targetMonth - 1];
    const timestampMs = Date.UTC(targetYear, targetMonth - 1, finalDay, targetHours, targetMinutes, 0) - (5.5 * 60 * 60 * 1000);

    return {
      year: targetYear,
      month: targetMonth,
      day: finalDay,
      weekday,
      weekdayIndex: utcDate.getUTCDay(),
      dateString,
      isoWithTimezone,
      hours: targetHours,
      minutes: targetMinutes,
      timestampMs,
      displayDate: `${padDay} ${monthName} ${targetYear}`,
      displayFull: `${weekday}, ${padDay} ${monthName} ${targetYear}`,
      displayShort: `${monthName} ${finalDay}, ${targetYear}`,
      timeFormatted: formatTime12h(time || `${padHours}:${padMinutes}`)
    };
  }
}

/**
 * Returns exact meeting timestamp in milliseconds (UTC) for accurate time comparison.
 */
export function getMeetingTimestampInIST(dateVal: any, timeStr: string = '07:30'): number {
  const parts = parseMeetingDateParts(dateVal, timeStr);
  if (!parts) return 0;
  return parts.timestampMs;
}

/**
 * Returns true if the meeting is completed according to its flags or status.
 */
export function isMeetingCompleted(meeting: any): boolean {
  if (!meeting) return false;
  const statusStr = String(meeting.status || '').trim().toUpperCase();
  if (statusStr === 'COMPLETED' || statusStr === 'DONE') return true;
  if (meeting.isCompleted === true || meeting.isCompleted === 'true') return true;
  if (meeting.is_completed === true || meeting.is_completed === 'true') return true;
  return false;
}

/**
 * Returns true if the meeting was cancelled.
 */
export function isMeetingCancelled(meeting: any): boolean {
  if (!meeting) return false;
  const statusStr = String(meeting.status || '').trim().toUpperCase();
  if (statusStr === 'CANCELLED' || statusStr === 'CANCELED') return true;
  if (meeting.isCancelled === true || meeting.isCancelled === 'true') return true;
  if (meeting.is_cancelled === true || meeting.is_cancelled === 'true') return true;
  return false;
}

/**
 * Returns true if the meeting is finished (completed or cancelled).
 */
export function isMeetingDone(meeting: any): boolean {
  return isMeetingCompleted(meeting) || isMeetingCancelled(meeting);
}

/**
 * Returns true if the scheduled date and time of the meeting has passed in Asia/Kolkata.
 */
export function isMeetingInPastInIST(meeting: any): boolean {
  if (!meeting || !meeting.date) return false;
  const meetingMs = getMeetingTimestampInIST(meeting.date, meeting.time || '07:30');
  const nowMs = Date.now();
  return meetingMs > 0 && meetingMs < nowMs;
}

/**
 * Returns true if the meeting is an upcoming/future occurrence (not done and not in the past).
 */
export function isMeetingUpcomingInIST(meeting: any): boolean {
  if (!meeting) return false;
  if (isMeetingDone(meeting)) return false;
  return !isMeetingInPastInIST(meeting);
}

/**
 * Compares two dates by their YYYY-MM-DD calendar date in IST.
 */
export function isSameMeetingDate(date1: any, date2: any): boolean {
  const p1 = parseMeetingDateParts(date1);
  const p2 = parseMeetingDateParts(date2);
  if (!p1 || !p2) return false;
  return p1.dateString === p2.dateString;
}

/**
 * Formats a meeting date for display across the application consistently in IST.
 */
export function formatMeetingDateDisplay(
  dateVal: any,
  timeStr?: string,
  formatType: 'full' | 'standard' | 'short' | 'weekday' | 'dateOnly' = 'full'
): string {
  const parts = parseMeetingDateParts(dateVal, timeStr);
  if (!parts) return 'N/A';

  switch (formatType) {
    case 'full':
      return parts.displayFull; // e.g. "Monday, 17 Aug 2026"
    case 'standard':
      return parts.displayDate; // e.g. "17 Aug 2026"
    case 'short':
      return parts.displayShort; // e.g. "Aug 17, 2026"
    case 'weekday':
      return parts.weekday; // e.g. "Monday"
    case 'dateOnly':
      return parts.dateString; // e.g. "2026-08-17"
    default:
      return parts.displayFull;
  }
}
