with open('src/components/members/MemberTable.tsx', 'r') as f:
    content = f.read()

replacement1 = """<Avatar src={member.photoURL} name={member.name} size="w-11 h-11" className="border border-white/5 shrink-0 shadow-sm" fallbackClassName="text-sm" />"""

import re
content = re.sub(r'<div className="w-11 h-11 rounded-full bg-\[#151C2E\] border border-white/5 overflow-hidden shrink-0 shadow-sm">\s*<img\s*src=\{member\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(member\.name \|\| \'\'\)\}&background=random`\}\s*className="w-full h-full object-cover"\s*referrerPolicy="no-referrer"\s*/>\s*</div>', replacement1, content)

replacement2 = """<Avatar src={member.photoURL} name={member.name} size="w-12 h-12" className="rounded-[12px] border border-white/5 shrink-0 shadow-sm" fallbackClassName="rounded-[12px] text-lg" />"""

content = re.sub(r'<div className="w-12 h-12 rounded-\[12px\] bg-\[#151C2E\] border border-white/5 overflow-hidden shrink-0 shadow-sm">\s*<img\s*src=\{member\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(member\.name \|\| \'\'\)\}&background=random`\}\s*className="w-full h-full object-cover"\s*referrerPolicy="no-referrer"\s*/>\s*</div>', replacement2, content)

with open('src/components/members/MemberTable.tsx', 'w') as f:
    f.write(content)
