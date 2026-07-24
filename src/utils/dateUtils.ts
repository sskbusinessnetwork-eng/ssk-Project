import { format as originalFormat, isValid } from 'date-fns';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

export function safeFormatDate(dateValue: string | Date | null | undefined, formatStr: string, fallback: string = 'N/A'): string {
  if (!dateValue) return fallback;
  const d = new Date(dateValue);
  return isValid(d) ? format(d, formatStr) : fallback;
}
