import re

with open('src/components/members/AddMemberModal.tsx', 'r') as f:
    content = f.read()

if 'Eye' not in content:
    content = content.replace("Lock,", "Lock, Eye, EyeOff,")

old_input = r"""            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              
              type="text"
              name="password"
              placeholder="Set initial password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
            />"""

new_input = r"""            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Set initial password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-11 pl-10 pr-10 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>"""

content = content.replace(old_input, new_input)

with open('src/components/members/AddMemberModal.tsx', 'w') as f:
    f.write(content)
