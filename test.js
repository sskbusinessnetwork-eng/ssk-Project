function isWithinDateRange(dateVal, start, end) {
  if (!dateVal) return false;
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return false;
    return date >= start && date <= end;
  } catch {
    return false;
  }
}

const parsedStart = new Date('' + 'T00:00:00');
const parsedEnd = new Date('' + 'T23:59:59');

console.log(isWithinDateRange('2026-08-01', parsedStart, parsedEnd));
