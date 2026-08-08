import re

with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    content = f.read()

# Make sure PhoneCall is imported
if 'PhoneCall' not in content:
    content = content.replace("import { Plus, Search, Filter,", "import { Plus, Search, Filter, PhoneCall,")

old_cell = r"""                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.phone}
                    </td>"""
new_cell = r"""                    <td className="px-4 py-3 text-sm text-neutral-300">
                      <div className="flex items-center gap-2">
                        {user.phone}
                        {user.phone && (
                          <a href={`tel:${user.phone}`} className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="Call">
                            <PhoneCall size={12} />
                          </a>
                        )}
                      </div>
                    </td>"""

content = content.replace(old_cell, new_cell)

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.write(content)
