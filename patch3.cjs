const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target = `  // Calculate total score based on points earned across all tasks
  const rawScore = tasks.reduce((acc, t) => acc + (t.isDone ? (t.pointsVal || 0) : 0), 0);
  let todayScore = Math.round(rawScore);
  
  // Enforce score cap between 0 and 100%
  todayScore = Math.min(100, Math.max(0, todayScore));`;

const replacement = `  // Growth Score = Completed Tasks ÷ Total Available Tasks × 100
  let rawScore = 0;
  if (totalTasksCount > 0) {
    rawScore = (completedTasksCount / totalTasksCount) * 100;
  }
  let todayScore = Math.round(rawScore);
  
  // Enforce score cap between 0 and 100%
  todayScore = Math.min(100, Math.max(0, todayScore));`;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const pattern = new RegExp(escapeRegExp(target).replace(/\\s\+/g, '\\s+'));
code = code.replace(pattern, replacement);
fs.writeFileSync('src/utils/growthScore.ts', code);
console.log('done patch3');
