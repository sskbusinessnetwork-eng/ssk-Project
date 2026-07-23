with open('src/pages/Connections.tsx', 'r') as f:
    content = f.read()

replacement = """<Avatar src={member.photoURL} name={member.name} size="w-12 h-12" className="border border-white/10 shrink-0 shadow-inner" />"""

import re
content = re.sub(r'<div className="w-12 h-12 rounded-full bg-\[#0F172A\] flex items-center justify-center overflow-hidden border border-white/10 shrink-0 shadow-inner">\s*<img\s*src=\{member\.photoURL \|\| `https://picsum\.photos/seed/\$\{member\.uid\}/100/100`\}\s*className="w-full h-full object-cover"\s*referrerPolicy="no-referrer"\s*/>\s*</div>', replacement, content)

with open('src/pages/Connections.tsx', 'w') as f:
    f.write(content)
