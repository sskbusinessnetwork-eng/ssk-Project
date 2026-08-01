const fs = require('fs');
const file = 'src/utils/growthScore.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
`    if (!isProfileCompleteAuto || isDateInRange(profile.updated_at || profile.created_at)) {
      rawTasks.push({
        key: \`task_complete_profile_\${dateStr}\`,
        label: 'Complete Your Profile',
        desc: 'Fill all required profile details.',
        autoDone: isProfileCompleteAuto,
        link: '/profile',
        linkText: isProfileCompleteAuto ? 'VIEW' : 'COMPLETE',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        pointsVal: 100
      });
    }`,
`    // Always show it for points calculation, but maybe hide it from UI if it's too old?
    // The user wants it to be marked as completed automatically.
    // If it's complete, they get points.
    if (!isProfileCompleteAuto || isDateInRange(profile.updated_at || profile.created_at)) {
      rawTasks.push({
        key: \`task_complete_profile_\${dateStr}\`,
        label: 'Complete Your Profile',
        desc: 'Fill all required profile details.',
        autoDone: isProfileCompleteAuto,
        link: '/profile',
        linkText: isProfileCompleteAuto ? 'VIEW' : 'COMPLETE',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        pointsVal: 100
      });
    } else if (isProfileCompleteAuto) {
        // Just add it to the score, but don't show it? No, if it's completed we should show it if they completed it THIS month. Which isDateInRange covers.
        // Wait, if it was completed BEFORE this month, should they get the 100 points for this month? 
        // Growth Score resets every month? 
        // Growth score is a cumulative or monthly score?
    }`
);
