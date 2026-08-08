import re

with open('src/pages/Profile.tsx', 'r') as f:
    content = f.read()

if 'PhoneCall' not in content:
    content = content.replace("import { Phone, Mail, ", "import { Phone, PhoneCall, Mail, ")

old_phone = r"""                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-white">{targetProfile.phone || 'Not specified'}</p>"""

new_phone = r"""                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone Number</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{targetProfile.phone || 'Not specified'}</p>
                  {targetProfile.phone && (
                    <a href={`tel:${targetProfile.phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                      <PhoneCall size={12} />
                    </a>
                  )}
                </div>"""

content = content.replace(old_phone, new_phone)

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(content)
