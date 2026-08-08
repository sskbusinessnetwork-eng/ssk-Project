import re

with open('src/pages/Guests.tsx', 'r') as f:
    content = f.read()

if 'PhoneCall' not in content:
    content = content.replace("import { Plus, X, Phone, UserPlus", "import { Plus, X, Phone, PhoneCall, UserPlus")

old_phone = r"""                  <a href={`tel:${selectedGuest.guest_phone}`} className="text-sm font-semibold text-white hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5">
                    <Phone size={12} className="text-primary" />
                    {selectedGuest.guest_phone}
                  </a>"""

new_phone = r"""                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-white">{selectedGuest.guest_phone}</p>
                    <a href={`tel:${selectedGuest.guest_phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call Guest">
                      <PhoneCall size={12} />
                    </a>
                  </div>"""
content = content.replace(old_phone, new_phone)

old_wa = r"""                  <a href={`https://wa.me/${normalizePhoneNumber(selectedGuest.guest_whatsapp)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5 mt-0.5">
                    <MessageSquare size={12} className="text-emerald-400" />
                    {selectedGuest.guest_whatsapp}
                  </a>"""

new_wa = r"""                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-white">{selectedGuest.guest_whatsapp}</p>
                    <a href={`https://wa.me/${normalizePhoneNumber(selectedGuest.guest_whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp Guest">
                      <MessageSquare size={12} />
                    </a>
                  </div>"""

content = content.replace(old_wa, new_wa)

with open('src/pages/Guests.tsx', 'w') as f:
    f.write(content)
