import re

with open('src/components/members/MemberTable.tsx', 'r') as f:
    content = f.read()

if 'PhoneCall' not in content:
    content = content.replace("import { ", "import { PhoneCall, ")

old_phone_block = r"""                  <div className="flex items-center gap-1 mt-2 text-[11px] text-neutral-300 font-medium">
                    <Phone size={10} className="text-neutral-500" />
                    <span>{member.phone || 'No Phone'}</span>
                  </div>"""

new_phone_block = r"""                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
                      <Phone size={10} className="text-neutral-500" />
                      <span>{member.phone || 'No Phone'}</span>
                    </div>
                    {member.phone && (
                      <a 
                        href={`tel:${member.phone}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                        title="Call Member"
                      >
                        <PhoneCall size={10} />
                      </a>
                    )}
                  </div>"""

content = content.replace(old_phone_block, new_phone_block)

with open('src/components/members/MemberTable.tsx', 'w') as f:
    f.write(content)
