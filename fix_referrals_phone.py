import re

with open('src/pages/Referrals.tsx', 'r') as f:
    content = f.read()

# Make sure PhoneCall is imported
if 'PhoneCall' not in content:
    content = content.replace("import { Plus, X, Phone,", "import { Plus, X, Phone, PhoneCall,")
    content = content.replace("import { Search, Plus, Phone,", "import { Search, Plus, Phone, PhoneCall,")
    # let's just do a generic check
    if 'PhoneCall' not in content:
        content = content.replace("Phone,", "Phone, PhoneCall,")

# Replace ref.contactPhone display
old_display = r"""                            <p className="font-semibold text-white truncate">{ref.contactName} {ref.contactPhone ? `(${ref.contactPhone})` : ''}</p>"""

new_display = r"""                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white truncate">{ref.contactName} {ref.contactPhone ? `(${ref.contactPhone})` : ''}</p>
                              {ref.contactPhone && (
                                <a href={`tel:${ref.contactPhone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0" title="Call">
                                  <PhoneCall size={12} />
                                </a>
                              )}
                            </div>"""

content = content.replace(old_display, new_display)


old_selected = r"""                      <p className="text-xs font-medium text-neutral-400">{selectedReferral.contactPhone}</p>"""
new_selected = r"""                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-neutral-400">{selectedReferral.contactPhone}</p>
                        {selectedReferral.contactPhone && (
                          <a href={`tel:${selectedReferral.contactPhone}`} className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call">
                            <PhoneCall size={10} />
                          </a>
                        )}
                      </div>"""

content = content.replace(old_selected, new_selected)

with open('src/pages/Referrals.tsx', 'w') as f:
    f.write(content)
