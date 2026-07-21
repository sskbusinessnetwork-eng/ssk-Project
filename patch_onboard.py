import re
with open('src/pages/OnboardMember.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'(<button \n\s*onClick=\{\(\) => \{\n\s*setEditingId\(member\.uid\);)',
    r'{profile?.uid === member.uid && \1',
    content
)

content = re.sub(
    r'(title="Edit Member"\n\s*>\n\s*<Edit2 size=\{16\} />\n\s*</button>)',
    r'\1}',
    content
)

with open('src/pages/OnboardMember.tsx', 'w') as f:
    f.write(content)
