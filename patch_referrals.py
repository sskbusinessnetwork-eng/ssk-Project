with open('src/pages/Referrals.tsx', 'r') as f:
    content = f.read()

import re

# Block 1
replacement1 = """<Avatar src={selectedReferral.senderPhoto} name={selectedReferral.senderFullName || 'Sender'} size="w-9 h-9" className="border border-white/10 shrink-0" />"""
content = re.sub(r'\{selectedReferral\.senderPhoto \? \(\s*<img\s*src=\{selectedReferral\.senderPhoto\}\s*alt=\{selectedReferral\.senderFullName \|\| \'Sender\'\}\s*className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">\s*\{\(selectedReferral\.senderFullName \|\| \'S\'\)\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', replacement1, content)

# Block 2
replacement2 = """<Avatar src={selectedReferral.receiverPhoto} name={selectedReferral.receiverFullName || 'Receiver'} size="w-9 h-9" className="border border-white/10 shrink-0" />"""
content = re.sub(r'\{selectedReferral\.receiverPhoto \? \(\s*<img\s*src=\{selectedReferral\.receiverPhoto\}\s*alt=\{selectedReferral\.receiverFullName \|\| \'Receiver\'\}\s*className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">\s*\{\(selectedReferral\.receiverFullName \|\| \'R\'\)\.charAt\(0\)\.toUpperCase\(\)\}\s*</div>\s*\)\}', replacement2, content)

with open('src/pages/Referrals.tsx', 'w') as f:
    f.write(content)
