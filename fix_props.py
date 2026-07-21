import re

with open('src/components/MasterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'  leadershipStats\?: \{(.*?)\};\n\}',
    r'  leadershipStats?: {\1};\n  tasks?: any[];\n}',
    content,
    flags=re.DOTALL
)

with open('src/components/MasterAdminCompanionView.tsx', 'w') as f:
    f.write(content)

with open('src/components/ChapterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

if 'tasks?: any[];' not in content:
    content = re.sub(
        r'  chapterReferralsList\?: any\[\];\n\}',
        r'  chapterReferralsList?: any[];\n  tasks?: any[];\n}',
        content,
        flags=re.DOTALL
    )

with open('src/components/ChapterAdminCompanionView.tsx', 'w') as f:
    f.write(content)

