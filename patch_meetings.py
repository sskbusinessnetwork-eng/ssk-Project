with open('src/pages/Meetings.tsx', 'r') as f:
    content = f.read()

import re

# Block 1
replacement1 = """<Avatar src={member.photoURL} name={member.name} size="w-8 h-8" className="rounded-lg shrink-0" fallbackClassName="rounded-lg text-xs" />"""
content = re.sub(r'<img\s*src=\{member\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(member\.name \|\| \'\'\)\}&background=random`\}\s*className="w-8 h-8 rounded-lg shrink-0"\s*referrerPolicy="no-referrer"\s*/>', replacement1, content)

# Block 2
replacement2 = """<Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-6 h-6" className="rounded-lg" fallbackClassName="rounded-lg text-[10px]" />"""
content = re.sub(r'<img\s*src=\{member\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(member\.name \|\| member\.displayName \|\| \'Member\'\)\}&background=random`\}\s*className="w-6 h-6 rounded-lg"\s*referrerPolicy="no-referrer"\s*/>', replacement2, content)

# Block 3
replacement3 = """<Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-8 h-8" className="rounded-lg" fallbackClassName="rounded-lg text-xs" />"""
content = re.sub(r'<img\s*src=\{member\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(member\.name \|\| member\.displayName \|\| \'Member\'\)\}&background=random`\}\s*className="w-8 h-8 rounded-lg"\s*referrerPolicy="no-referrer"\s*/>', replacement3, content)

with open('src/pages/Meetings.tsx', 'w') as f:
    f.write(content)
