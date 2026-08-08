import re

with open('src/pages/Positions.tsx', 'r') as f:
    content = f.read()

if 'PhoneCall' not in content:
    content = content.replace("import { Crown, ", "import { Crown, PhoneCall, ")

old_phone = r"""                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                          <Phone size={14} className="text-neutral-500" />
                          {member.phone || 'N/A'}
                        </div>
                      </td>"""

new_phone = r"""                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <div className="flex items-center gap-1.5">
                            <Phone size={14} className="text-neutral-500" />
                            {member.phone || 'N/A'}
                          </div>
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                              <PhoneCall size={12} />
                            </a>
                          )}
                        </div>
                      </td>"""

content = content.replace(old_phone, new_phone)

with open('src/pages/Positions.tsx', 'w') as f:
    f.write(content)
