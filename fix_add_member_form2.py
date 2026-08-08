import re

with open('src/components/members/AddMemberForm.tsx', 'r') as f:
    content = f.read()

old_input = r"""            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Set initial password"
              className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              
            />"""
new_input = r"""            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Set initial password"
              className="w-full h-11 pl-11 pr-10 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>"""

content = content.replace(old_input, new_input)

with open('src/components/members/AddMemberForm.tsx', 'w') as f:
    f.write(content)
