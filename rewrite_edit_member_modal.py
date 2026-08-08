import re

with open('src/components/members/EditMemberModal.tsx', 'r') as f:
    content = f.read()

# Add state
state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(false\);')
state_replacement = r"""  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

if 'Eye' not in content:
    content = content.replace("import { X, Save, Building2, Briefcase, Phone, Tag, Lock, Crown } from 'lucide-react';", "import { X, Save, Building2, Briefcase, Phone, Tag, Lock, Crown, Eye, EyeOff } from 'lucide-react';")

# replace input
input_pattern = r"""              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-neutral-400 placeholder:font-normal placeholder:text-xs"
              />"""

replacement_pattern = r"""              <input
                type={showPassword ? "text" : "password"}
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full h-11 pl-10 pr-10 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-neutral-400 placeholder:font-normal placeholder:text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>"""

content = content.replace(input_pattern, replacement_pattern)

with open('src/components/members/EditMemberModal.tsx', 'w') as f:
    f.write(content)
