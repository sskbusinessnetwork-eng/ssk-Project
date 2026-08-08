import re

with open('src/pages/Admins.tsx', 'r') as f:
    content = f.read()

# Make sure PhoneCall is imported
if 'PhoneCall' not in content:
    content = content.replace("import { Plus, Shield, Phone,", "import { Plus, Shield, Phone, PhoneCall,")

old_list = r"""                            <div>
                              <span className="font-bold text-neutral-900 block">{admin.name}</span>
                              <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                                {admin.phone}
                              </span>
                            </div>"""

new_list = r"""                            <div>
                              <span className="font-bold text-neutral-900 block">{admin.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                                  {admin.phone}
                                </span>
                                {admin.phone && (
                                  <a href={`tel:${admin.phone}`} className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="Call">
                                    <PhoneCall size={10} />
                                  </a>
                                )}
                              </div>
                            </div>"""
content = content.replace(old_list, new_list)

old_grid = r"""                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phone</p>
                      <p className="text-xs font-bold text-neutral-700">{admin.phone || 'N/A'}</p>
                    </div>"""

new_grid = r"""                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-neutral-700">{admin.phone || 'N/A'}</p>
                        {admin.phone && (
                          <a href={`tel:${admin.phone}`} className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors shrink-0" title="Call">
                            <PhoneCall size={10} />
                          </a>
                        )}
                      </div>
                    </div>"""
content = content.replace(old_grid, new_grid)

with open('src/pages/Admins.tsx', 'w') as f:
    f.write(content)
