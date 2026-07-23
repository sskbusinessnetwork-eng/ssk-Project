with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

import re

replacement = """<Avatar src={selectedMember.photo_url || selectedMember.photoURL || selectedMember.avatar_url || selectedMember.profile_photo} name={getUserFullName(selectedMember)} size="w-7 h-7" className="border border-white/10 shrink-0" fallbackClassName="text-[10px] border border-white/5" />"""

content = re.sub(r'\{selectedMember\.photo_url \|\| selectedMember\.photoURL \|\| selectedMember\.avatar_url \|\| selectedMember\.profile_photo \? \(\s*<img\s*src=\{selectedMember\.photo_url \|\| selectedMember\.photoURL \|\| selectedMember\.avatar_url \|\| selectedMember\.profile_photo\}\s*alt=\{getUserFullName\(selectedMember\)\}\s*className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-\[10px\] font-bold flex items-center justify-center shrink-0 border border-white/5">\s*\{getUserFullName\(selectedMember\)\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', replacement, content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
