const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf8');

const targetOperations = `  const operations = [
    { icon: Share2, label: 'Pass Referral', desc: 'Generate leads', path: '/refer', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Calendar, label: 'Book 1-to-1', desc: 'Schedule sync', path: '/one-to-one', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: UserPlus, label: 'Invite Member', desc: 'Grow your network', path: '/guests', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Users, label: 'Find Members', desc: 'Explore directory', path: '/directory', color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];`;

const replacementOperations = `  const isChapterLeader = profile?.role === 'CHAPTER_ADMIN' || ['president', 'vice_president', 'treasurer', 'chapter_admin'].includes(profile?.position?.toLowerCase() || '');

  const operations = [
    { icon: Share2, label: 'Pass Referral', desc: 'Generate leads', path: '/refer', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Calendar, label: 'Book 1-to-1', desc: 'Schedule sync', path: '/one-to-one', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: UserPlus, label: 'Invite Member', desc: 'Grow your network', path: '/guests', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Users, label: 'Find Members', desc: 'Explore directory', path: '/directory', color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];

  if (isChapterLeader) {
    operations.push(
      { icon: Calendar, label: 'Start Meeting', desc: 'Organize logs', path: '/meetings', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { icon: CheckCircle2, label: 'Attendance', desc: 'Verify rosters', path: '/meetings', color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
    );
  }`;

code = code.replace(targetOperations, replacementOperations);

const targetTasks = `  const displayTasks = todayTasks.length > 0 ? todayTasks : [
    { key: 't1', label: "Schedule Introductory 1-to-1s", isDone: true, link: "/one-to-one", linkText: "Schedule" },
    { key: 't2', label: "Update Professional Profile", isDone: true, link: "/settings", linkText: "Profile" },
    { key: 't3', label: "Pass First Qualified Referral", isDone: false, link: "/refer", linkText: "Refer" },
  ];`;

const replacementTasks = `  let displayTasks = todayTasks.length > 0 ? [...todayTasks] : [
    { key: 't1', label: "Schedule Introductory 1-to-1s", isDone: true, link: "/one-to-one", linkText: "Schedule" },
    { key: 't2', label: "Update Professional Profile", isDone: true, link: "/settings", linkText: "Profile" },
    { key: 't3', label: "Pass First Qualified Referral", isDone: false, link: "/refer", linkText: "Refer" },
  ];

  if (isChapterLeader) {
    const chapterAdminTasks = [
      { key: 'a1', label: "Process Pending Referrals", isDone: true, link: "/reports", linkText: "Review" },
      { key: 'a2', label: "Update Weekly Attendance", isDone: false, link: "/meetings", linkText: "Update" },
      { key: 'a3', label: "Approve New Member Applications", isDone: false, link: "/guests", linkText: "Review" },
    ];
    // Avoid duplicating if they are already somehow there, though they use different keys
    displayTasks = [...displayTasks, ...chapterAdminTasks];
  }`;

code = code.replace(targetTasks, replacementTasks);

fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
console.log('done patch');
