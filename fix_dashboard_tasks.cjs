const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /\/\/ 1\. Invite Visitor \(10 pts\)[\s\S]*?\}\);/;
const replacement = `// 1. Invite a New Guest (10 pts)
    const hasInvitedToday = userGuests.some(g => isToday(g.createdAt || g.created_at || g.date) || g.attendance_status === 'Present');
    const isChecklistDone = profile.workspace_checklist?.['Invite a New Guest'] === true;
    const isDoneFinal = hasInvitedToday || isChecklistDone;
    
    tasks.push({
      key: 'task_invite_visitor',
      label: 'Invite a New Guest',
      desc: isDoneFinal ? 'You invited a guest who attended.' : 'Invite a visitor to earn 10 points.',
      isDone: isDoneFinal,
      link: '/guests',
      linkText: 'INVITE',
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      icon: UserPlus,
      points: 10
    });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', code);
