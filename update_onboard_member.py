import re

with open('src/pages/OnboardMember.tsx', 'r') as f:
    content = f.read()

if 'PhoneCall' not in content:
    content = content.replace("import { Plus, Check, X, Phone, UserPlus,", "import { Plus, Check, X, Phone, PhoneCall, UserPlus,")

old_phones = r"""                    <div className="flex flex-col gap-1 text-sm text-neutral-600">
                      <div className="flex items-center gap-1.5"><Phone size={12}/> {member.phone}</div>
                      {member.whatsappNumber && <div className="flex items-center gap-1.5"><Phone size={12} className="text-emerald-500"/> {member.whatsappNumber}</div>}
                    </div>"""

new_phones = r"""                    <div className="flex flex-col gap-2 text-sm text-neutral-600">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5"><Phone size={12}/> {member.phone}</div>
                        {member.phone && (
                          <a href={`tel:${member.phone}`} className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call">
                            <PhoneCall size={10} />
                          </a>
                        )}
                      </div>
                      {member.whatsappNumber && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5"><Phone size={12} className="text-emerald-500"/> {member.whatsappNumber}</div>
                          <a href={`https://wa.me/${member.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp">
                            <PhoneCall size={10} />
                          </a>
                        </div>
                      )}
                    </div>"""

content = content.replace(old_phones, new_phones)

with open('src/pages/OnboardMember.tsx', 'w') as f:
    f.write(content)
