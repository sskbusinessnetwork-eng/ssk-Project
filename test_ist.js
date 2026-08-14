function getISTDayBounds(inputDate = new Date()) {
  try {
    let date = new Date(inputDate);
    if (isNaN(date.getTime())) date = new Date();
    let year, month, day;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const parts = formatter.formatToParts(date);
      year = parts.find(p => p.type === "year")?.value;
      month = parts.find(p => p.type === "month")?.value;
      day = parts.find(p => p.type === "day")?.value;
    } catch (e) {
      year = date.getFullYear().toString();
      month = (date.getMonth() + 1).toString().padStart(2, "0");
      day = date.getDate().toString().padStart(2, "0");
    }
    const start = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const localStart = new Date(date);
      localStart.setHours(0, 0, 0, 0);
      const localEnd = new Date(date);
      localEnd.setHours(23, 59, 59, 999);
      return { start: localStart, end: localEnd };
    }
    return { start, end };
  } catch (e) {
    const fallbackStart = new Date();
    fallbackStart.setHours(0, 0, 0, 0);
    const fallbackEnd = new Date();
    fallbackEnd.setHours(23, 59, 59, 999);
    return { start: fallbackStart, end: fallbackEnd };
  }
}
console.log(getISTDayBounds("2026-08-01"));
console.log(getISTDayBounds("2026-08-01T00:00:00"));
