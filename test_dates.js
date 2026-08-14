const startDate = '2026-08-01';
const endDate = '2026-08-01';

const parsedStart = new Date(startDate + 'T00:00:00');
const parsedEnd = new Date(endDate + 'T23:59:59.999');

console.log("Start:", parsedStart.toISOString());
console.log("End:", parsedEnd.toISOString());

const dateVal = '2026-08-01T10:00:00.000Z';
const date = new Date(dateVal);

console.log("dateVal:", dateVal);
console.log("date:", date.toISOString());
console.log(date >= parsedStart && date <= parsedEnd);
