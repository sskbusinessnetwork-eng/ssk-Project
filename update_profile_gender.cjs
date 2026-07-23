const fs = require('fs');

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

// Add gender to types if we need, but we can just use formData.gender
if (!content.includes('gender:')) {
  // Add gender to profile fetching
  content = content.replace(/whatsapp_number:/g, "gender: data.gender || '',\n        whatsapp_number:");
  
  // Add to useState form state
  content = content.replace(/whatsapp_number: '',/g, "gender: '',\n    whatsapp_number: '',");
  
  // Update payload in handleSave
  content = content.replace(/whatsapp_number: formData.whatsapp_number,/g, "gender: formData.gender,\n      whatsapp_number: formData.whatsapp_number,");
  
  // Add Gender Dropdown before the Business Information section
  const genderHtml = `
            {/* Gender Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/90">Gender <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  value={formData.gender || ''}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  disabled={!isEditing}
                  className={cn(
                    "w-full bg-[#0B1220] border rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all duration-300 appearance-none",
                    isEditing ? "border-white/10 hover:border-white/20 focus:border-red-500/50 focus:bg-[#0B1220]/80" : "border-transparent opacity-70 cursor-default"
                  )}
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer Not to Say">Prefer Not to Say</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>
`;
  
  content = content.replace(/<div className="pt-6 border-t border-white\/5">/g, genderHtml + '\n            <div className="pt-6 border-t border-white/5">');
  
  fs.writeFileSync('src/pages/Profile.tsx', content);
}

