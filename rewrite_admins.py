import re

with open('src/pages/Admins.tsx', 'r') as f:
    content = f.read()

state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(true\);')
state_replacement = r"""  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

if 'Eye' not in content:
    content = content.replace("import { Shield, Plus, Edit2, Trash2, Mail, Phone, Crown, Check, X, Search, Lock } from 'lucide-react';", "import { Shield, Plus, Edit2, Trash2, Mail, Phone, Crown, Check, X, Search, Lock, Eye, EyeOff } from 'lucide-react';")
    content = content.replace("import { Shield, Plus, Edit2, Trash2, Mail, Phone, Crown, Check, X, Search } from 'lucide-react';", "import { Shield, Plus, Edit2, Trash2, Mail, Phone, Crown, Check, X, Search, Eye, EyeOff } from 'lucide-react';")

input_pattern = r"""                <input
                  required={!editingAdmin}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? "Leave blank to keep current" : "Minimum 6 characters"}
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-[12px] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />"""
replacement = r"""                <input
                  required={!editingAdmin}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? "Leave blank to keep current" : "Minimum 6 characters"}
                  minLength={6}
                  className="w-full pl-10 pr-10 py-3 rounded-[12px] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>"""
content = content.replace(input_pattern, replacement)

with open('src/pages/Admins.tsx', 'w') as f:
    f.write(content)
