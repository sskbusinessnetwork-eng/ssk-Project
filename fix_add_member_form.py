import re

with open('src/components/members/AddMemberForm.tsx', 'r') as f:
    content = f.read()

state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(false\);')
state_replacement = r"""  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

if 'Eye' not in content:
    content = content.replace("import { Save, Plus, AlertCircle, Building2, User, Phone, CheckCircle2 } from 'lucide-react';", "import { Save, Plus, AlertCircle, Building2, User, Phone, CheckCircle2, Eye, EyeOff } from 'lucide-react';")

old_input = r"""            <div className="relative">
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Set initial password"
                className={`w-full h-11 px-4 bg-[#151C2E] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl focus:border-primary outline-none transition-all text-sm font-semibold text-white`}
              />
            </div>"""

new_input = r"""            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Set initial password"
                className={`w-full h-11 pl-4 pr-10 bg-[#151C2E] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl focus:border-primary outline-none transition-all text-sm font-semibold text-white`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>"""

content = content.replace(old_input, new_input)

with open('src/components/members/AddMemberForm.tsx', 'w') as f:
    f.write(content)
