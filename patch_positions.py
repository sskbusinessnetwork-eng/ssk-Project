with open('src/pages/Positions.tsx', 'r') as f:
    content = f.read()

import re

replacement = """<Avatar src={member.photoURL} name={member.name} size="w-10 h-10" className="border border-white/10" fallbackClassName="border border-white/10" />"""
content = re.sub(r'<div className="w-10 h-10 rounded-full bg-\[#0F172A\] flex items-center justify-center border border-white/10 overflow-hidden">\s*\{member\.photoURL \? \(\s*<img src=\{member\.photoURL\} alt=\{member\.name\} className="w-full h-full object-cover" />\s*\) : \(\s*<User size=\{18\} className="text-neutral-400 group-hover:text-primary transition-colors" />\s*\)\}\s*</div>', replacement, content)

with open('src/pages/Positions.tsx', 'w') as f:
    f.write(content)
