const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target2 = `  const avgScore = Math.round(totalMemberScores / N);
  const avgAnalysedDays = Math.max(1, Math.round(totalAnalysedDaysSum / N));
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';`;

const replacement2 = `  let avgScore = 0;
  if (totalTasksCount > 0) {
    avgScore = Math.round((totalCompletedTasks / totalTasksCount) * 100);
  }
  const avgAnalysedDays = Math.max(1, Math.round(totalAnalysedDaysSum / N));
  
  const maxPossible = 100;

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';`;

// Replace using regex that ignores whitespace differences
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const pattern = new RegExp(escapeRegExp(target2).replace(/\\s\+/g, '\\s+'));
code = code.replace(pattern, replacement2);

fs.writeFileSync('src/utils/growthScore.ts', code);
console.log('done');
