import re

with open('src/components/ChapterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

# Add tasks to props type
if 'tasks?: any[];' not in content:
    content = content.replace(
        'chapterReferralsList?: any[];',
        'chapterReferralsList?: any[];\n  tasks?: any[];'
    )

# Add tasks to component destructuring
content = content.replace(
        '  chapterReferralsList = [],\n}: ChapterAdminCompanionViewProps) {',
        '  chapterReferralsList = [],\n  tasks = [],\n}: ChapterAdminCompanionViewProps) {'
    )

# Replace displayTasks with passed tasks if provided
content = content.replace(
    '  const displayTasks = [\n    { key: \'t1\', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View" },\n    { key: \'t2\', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests" },\n    { key: \'t3\', label: "Validate Weekly Referral Audits", isDone: false, link: "/reports", linkText: "Audit" },\n  ];',
    '  const displayTasks = tasks.length > 0 ? tasks : [\n    { key: \'t1\', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View" },\n    { key: \'t2\', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests" },\n    { key: \'t3\', label: "Validate Weekly Referral Audits", isDone: false, link: "/reports", linkText: "Audit" },\n  ];'
)

with open('src/components/ChapterAdminCompanionView.tsx', 'w') as f:
    f.write(content)
