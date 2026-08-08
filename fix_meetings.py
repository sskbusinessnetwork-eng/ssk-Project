import re

with open('src/pages/Meetings.tsx', 'r') as f:
    content = f.read()

# Make sure PhoneCall is imported
if 'PhoneCall' not in content:
    content = content.replace("import { Plus, Search,", "import { Plus, Search, PhoneCall,")

old_cell = r"""                      <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">
                          {g.mobile || g.phone || 'N/A'}
                        </span>
                      </div>"""
new_cell = r"""                      <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">
                            {g.mobile || g.phone || 'N/A'}
                          </span>
                          {(g.mobile || g.phone) && (
                            <a href={`tel:${g.mobile || g.phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call Guest">
                              <PhoneCall size={12} />
                            </a>
                          )}
                        </div>
                      </div>"""

content = content.replace(old_cell, new_cell)

with open('src/pages/Meetings.tsx', 'w') as f:
    f.write(content)
