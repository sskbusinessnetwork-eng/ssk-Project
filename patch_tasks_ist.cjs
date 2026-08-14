const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target1 = `  const today = new Date();
  today.setHours(0, 0, 0, 0);
   
  let start = activeDateRange?.start ? new Date(activeDateRange.start) : new Date(today);
  start.setHours(0, 0, 0, 0);
   
  let end = activeDateRange?.end ? new Date(activeDateRange.end) : new Date(today);
  end.setHours(23, 59, 59, 999);
   
  if (end.getTime() - start.getTime() > 365 * 24 * 60 * 60 * 1000) {
    start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  const allTasks: WorkspaceTask[] = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const dStart = new Date(current);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(current);
    dEnd.setHours(23, 59, 59, 999);
    
    // Format date strictly as YYYY-MM-DD
    const dateStr = [
      dStart.getFullYear(),
      String(dStart.getMonth() + 1).padStart(2, '0'),
      String(dStart.getDate()).padStart(2, '0')
    ].join('-');`;

const rep1 = `  const todayBounds = getISTDayBounds(new Date());
  let start = activeDateRange?.start ? getISTDayBounds(activeDateRange.start).start : todayBounds.start;
  let end = activeDateRange?.end ? getISTDayBounds(activeDateRange.end).end : todayBounds.end;

  if (end.getTime() - start.getTime() > 365 * 24 * 60 * 60 * 1000) {
    start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    start = getISTDayBounds(start).start;
  }

  const allTasks: WorkspaceTask[] = [];

  for (let current = new Date(start); current.getTime() <= end.getTime(); current.setDate(current.getDate() + 1)) {
    const bounds = getISTDayBounds(current);
    const dStart = bounds.start;
    const dEnd = bounds.end;
    
    const dateStr = getISTDateString(current);`;

code = code.replace(target1, rep1);

fs.writeFileSync('src/utils/growthScore.ts', code);
console.log('done patch_tasks_ist');
