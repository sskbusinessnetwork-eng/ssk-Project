const meetings = [
  { id: '1', status: 'SCHEDULED', isCompleted: false },
  { id: '2', status: '', isCompleted: true },
  { id: '3', status: 'CANCELLED', isCompleted: false },
  { id: '4', status: 'COMPLETED', isCompleted: false }
];

const upcoming = meetings.filter(m => {
  const statusUpper = String(m.status || '').trim().toUpperCase();
  if (statusUpper === 'COMPLETED' || statusUpper === 'CANCELLED' || statusUpper === 'NOT_COMPLETED') return false;
  if (m.isCompleted === true || String(m.isCompleted) === 'true') return false;
  return true;
});

const past = meetings.filter(m => {
  const statusUpper = String(m.status || '').trim().toUpperCase();
  const isActuallyCompleted = statusUpper === 'COMPLETED' || m.isCompleted === true || String(m.isCompleted) === 'true';
  const isActuallyCancelled = statusUpper === 'CANCELLED';
  const isActuallyNotCompleted = statusUpper === 'NOT_COMPLETED';
  
  if (!isActuallyCompleted && !isActuallyCancelled && !isActuallyNotCompleted) return false;
  return true;
});

console.log("Upcoming:", upcoming);
console.log("Past:", past);
