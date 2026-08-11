const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target = `  // Calculate max possible score based on subscription date range
  let subStartStr = profile.subscriptionStart || profile.subscriptionStartDate || profile.created_at || profile.createdAt;
  let subEndStr = profile.subscriptionEnd || profile.subscriptionEndDate || profile.current_subscription_end_date;
  if (subStartStr && !subEndStr) {
     const sDate = new Date(subStartStr);
     sDate.setFullYear(sDate.getFullYear() + 1);
     subEndStr = sDate.toISOString();
  }
     
  const today = new Date();
  today.setHours(0,0,0,0);
  const effectiveStart = subStartStr ? new Date(subStartStr) : new Date(today);
  const effectiveEnd = subEndStr ? new Date(subEndStr) : new Date(today);
     
  const start = effectiveStart;
  start.setHours(0,0,0,0);
  const end = effectiveEnd;
  end.setHours(23,59,59,999);`;

const replacement = `  // Default to today if no date range is provided
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);`;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const pattern = new RegExp(escapeRegExp(target).replace(/\\s\+/g, '\\s+'));
code = code.replace(pattern, replacement);
fs.writeFileSync('src/utils/growthScore.ts', code);
console.log('done patch5');
