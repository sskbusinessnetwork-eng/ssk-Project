const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf8');

const targetTasks = `  let displayTasks = todayTasks.length > 0 ? [...todayTasks] : [
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

const replacementTasks = `  let displayTasks = todayTasks.length > 0 ? [...todayTasks] : [
    { key: 't1', label: "Schedule Introductory 1-to-1s", isDone: true, link: "/one-to-one", linkText: "Schedule" },
    { key: 't2', label: "Update Professional Profile", isDone: true, link: "/settings", linkText: "Profile" },
    { key: 't3', label: "Pass First Qualified Referral", isDone: false, link: "/refer", linkText: "Refer" },
  ];`;

code = code.replace(targetTasks, replacementTasks);
fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
console.log('done task patch');
