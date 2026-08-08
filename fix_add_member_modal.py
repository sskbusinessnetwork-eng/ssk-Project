import re

with open('src/components/members/AddMemberModal.tsx', 'r') as f:
    content = f.read()

state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(false\);')
state_replacement = r"""  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

if 'Eye' not in content:
    content = content.replace("import { Plus, X, Building2, User, Phone, CheckCircle2 } from 'lucide-react';", "import { Plus, X, Building2, User, Phone, CheckCircle2, Eye, EyeOff } from 'lucide-react';")
    content = content.replace("import { X, Building2, User, Phone, CheckCircle2 } from 'lucide-react';", "import { X, Building2, User, Phone, CheckCircle2, Eye, EyeOff } from 'lucide-react';")

old_input = r"""          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Default Password *</label>
            <div className="relative">
              <input
                type="text"
                name="password"
                placeholder="Set initial password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full h-11 px-4 bg-[#151C2E] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl focus:border-primary outline-none transition-all text-sm font-semibold text-white`}
              />
            </div>
            {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password}</p>}
          </div>"""

new_input = r"""          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Default Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Set initial password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full h-11 pl-4 pr-10 bg-[#151C2E] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl focus:border-primary outline-none transition-all text-sm font-semibold text-white`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password}</p>}
          </div>"""

content = content.replace(old_input, new_input)

with open('src/components/members/AddMemberModal.tsx', 'w') as f:
    f.write(content)
