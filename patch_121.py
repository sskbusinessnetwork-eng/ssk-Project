with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

import re

# Block 1
content = re.sub(r'\{selectedMember\.photo_url \|\| selectedMember\.photoURL \|\| selectedMember\.avatar_url \|\| selectedMember\.profile_photo \? \(\s*<img\s*src=\{selectedMember\.photo_url \|\| selectedMember\.photoURL \|\| selectedMember\.avatar_url \|\| selectedMember\.profile_photo\}\s*alt=\{getUserFullName\(selectedMember\)\}\s*className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-\[10px\] font-bold flex items-center justify-center shrink-0 border border-white/5">\s*\{getUserFullName\(selectedMember\)\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', """<Avatar src={selectedMember.photo_url || selectedMember.photoURL || selectedMember.avatar_url || selectedMember.profile_photo} name={getUserFullName(selectedMember)} size="w-7 h-7" className="border border-white/10 shrink-0" fallbackClassName="text-[10px]" />""", content)

# Block 2
content = re.sub(r'\{mPhoto \? \(\s*<img\s*src=\{mPhoto\}\s*alt=\{mName\}\s*className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/10 shrink-0"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shadow-sm border border-white/10 shrink-0">\s*\{mName\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', """<Avatar src={mPhoto} name={mName} size="w-10 h-10" className="shadow-sm border border-white/10 shrink-0" />""", content)

# Block 3
content = re.sub(r'\{senderPhoto \? \(\s*<img src=\{senderPhoto\} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" alt=\{senderName\} referrerPolicy="no-referrer" />\s*\) : \(\s*<div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">\s*\{senderName\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', """<Avatar src={senderPhoto} name={senderName} size="w-8 h-8" className="border border-white/10 shrink-0" fallbackClassName="text-xs" />""", content)

# Block 4
content = re.sub(r'\{receiverPhoto \? \(\s*<img src=\{receiverPhoto\} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" alt=\{receiverName\} referrerPolicy="no-referrer" />\s*\) : \(\s*<div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">\s*\{receiverName\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', """<Avatar src={receiverPhoto} name={receiverName} size="w-8 h-8" className="border border-white/10 shrink-0" fallbackClassName="text-xs" />""", content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
