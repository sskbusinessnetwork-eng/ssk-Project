const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target1 = `  const today = new Date();
  today.setHours(0,0,0,0);
  const effectiveStart = subStartStr ? new Date(subStartStr) : new Date(today);
  const effectiveEnd = subEndStr ? new Date(subEndStr) : new Date(today);
     
  const start = effectiveStart;
  start.setHours(0,0,0,0);
  const end = effectiveEnd;
  end.setHours(23,59,59,999);
   
  const tasks = getWorkspaceChecklistTasks(profile, {
    allReferrals,
    oneToOnes,
    meetings,
    guestInvitations,
    allSlips,
    testimonials,
    allUsers
  }, { start, end });
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
     
  // Calculate total score based on points earned across all tasks
  const rawScore = tasks.reduce((acc, t) => acc + (t.isDone ? (t.pointsVal || 0) : 0), 0);
  const todayScore = Math.round(rawScore);
     
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;`;

const replacement1 = `  const today = new Date();
  today.setHours(0,0,0,0);
  const effectiveStart = subStartStr ? new Date(subStartStr) : new Date(today);
  const effectiveEnd = subEndStr ? new Date(subEndStr) : new Date(today);
  
  effectiveStart.setHours(0,0,0,0);
  effectiveEnd.setHours(23,59,59,999);

  // Calculation window: LAST 7 DAYS
  const calcEnd = new Date();
  calcEnd.setHours(23, 59, 59, 999);
  
  const calcStart = new Date();
  calcStart.setDate(calcStart.getDate() - 6);
  calcStart.setHours(0, 0, 0, 0);

  // Intersect LAST 7 DAYS with ACTIVE SUBSCRIPTION PERIOD
  const start = new Date(Math.max(calcStart.getTime(), effectiveStart.getTime()));
  const end = new Date(Math.min(calcEnd.getTime(), effectiveEnd.getTime()));

  let tasks: WorkspaceTask[] = [];
  if (start <= end) {
    tasks = getWorkspaceChecklistTasks(profile, {
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips,
      testimonials,
      allUsers
    }, { start, end });
  }
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
     
  // Growth Score = Completed Tasks ÷ Total Available Tasks × 100
  let rawScore = 0;
  if (totalTasksCount > 0) {
    rawScore = (completedTasksCount / totalTasksCount) * 100;
  }
  const todayScore = Math.round(rawScore);
     
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = start <= end ? Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;
  const maxPossible = 100;`;

// Replace using regex that ignores whitespace differences
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const pattern = new RegExp(escapeRegExp(target1).replace(/\s+/g, '\\s+'));
code = code.replace(pattern, replacement1);

fs.writeFileSync('src/utils/growthScore.ts', code);
console.log('done');
