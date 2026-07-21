import re

with open('src/components/MasterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

# Add tasks to props type
if 'tasks?: any[];' not in content:
    content = content.replace(
        'leadershipStats?: { chapterAdmins: number; presidents: number; vicePresidents: number; treasurers: number; };',
        'leadershipStats?: { chapterAdmins: number; presidents: number; vicePresidents: number; treasurers: number; };\n  tasks?: any[];'
    )

# Add tasks to component destructuring
content = content.replace(
        '  leadershipStats = { chapterAdmins: 0, presidents: 0, vicePresidents: 0, treasurers: 0 },\n}: MasterAdminCompanionViewProps) {',
        '  leadershipStats = { chapterAdmins: 0, presidents: 0, vicePresidents: 0, treasurers: 0 },\n  tasks = [],\n}: MasterAdminCompanionViewProps) {'
    )

# Replace displayTasks with passed tasks if provided
content = content.replace(
    '  const displayTasks = [\n    { key: \'t1\', label: "Audit & Authorize Chapter Admin Credentials", isDone: true, link: "/admins", linkText: "Admins" },\n    { key: \'t2\', label: "Monitor Global Directory and Listings Database", isDone: true, link: "/members", linkText: "Members" },\n    { key: \'t3\', label: "Review Cross-Region Referral Metrics", isDone: false, link: "/reports", linkText: "Reports" },\n  ];',
    '  const displayTasks = tasks.length > 0 ? tasks : [\n    { key: \'t1\', label: "Audit & Authorize Chapter Admin Credentials", isDone: true, link: "/admins", linkText: "Admins" },\n    { key: \'t2\', label: "Monitor Global Directory and Listings Database", isDone: true, link: "/members", linkText: "Members" },\n    { key: \'t3\', label: "Review Cross-Region Referral Metrics", isDone: false, link: "/reports", linkText: "Reports" },\n  ];'
)

with open('src/components/MasterAdminCompanionView.tsx', 'w') as f:
    f.write(content)
