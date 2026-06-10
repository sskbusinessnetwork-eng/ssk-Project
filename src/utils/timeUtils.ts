export function parseTimeTo24h(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 7, minutes: 30 };

  const cleaned = timeStr.trim();
  const isPM = cleaned.toUpperCase().includes('PM');
  const isAM = cleaned.toUpperCase().includes('AM');

  // Strip AM/PM and split by colon
  const onlyTimePart = cleaned.replace(/(AM|PM)/gi, '').trim();
  const parts = onlyTimePart.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) hours = 7;
  if (isNaN(minutes)) minutes = 30;

  if (isPM || isAM) {
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes };
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '07:30 AM';
  const { hours, minutes } = parseTimeTo24h(timeStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  let hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;
  const padHours = String(hours12).padStart(2, '0');
  const padMinutes = String(minutes).padStart(2, '0');
  return `${padHours}:${padMinutes} ${period}`;
}

export function parseTo12hParts(timeStr: string): { time: string; ampm: 'AM' | 'PM' } {
  if (!timeStr) return { time: '07:30', ampm: 'AM' };
  
  const cleaned = timeStr.trim();
  const isPM = cleaned.toUpperCase().includes('PM');
  const isAM = cleaned.toUpperCase().includes('AM');
  
  const onlyTimePart = cleaned.replace(/(AM|PM)/gi, '').trim();
  const parts = onlyTimePart.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  
  if (isNaN(hours)) hours = 7;
  if (isNaN(minutes)) minutes = 30;
  
  let period: 'AM' | 'PM' = 'AM';
  if (isPM) {
    period = 'PM';
  } else if (isAM) {
    period = 'AM';
  } else {
    if (hours >= 12) {
      period = 'PM';
    } else {
      period = 'AM';
    }
  }
  
  let hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;
  
  const formattedTime = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { time: formattedTime, ampm: period };
}
