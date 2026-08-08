import re

with open('src/pages/Members.tsx', 'r') as f:
    content = f.read()

state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(true\);')
state_replacement = r"""  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

if 'Eye' not in content:
    content = content.replace("import { Plus, Search, MapPin, Briefcase, X, Phone, UserCheck, UserMinus, UserPlus, CreditCard, Shield, AlertTriangle, User, Calendar, Edit2, Lock, FileText, Download } from 'lucide-react';", "import { Plus, Search, MapPin, Briefcase, X, Phone, UserCheck, UserMinus, UserPlus, CreditCard, Shield, AlertTriangle, User, Calendar, Edit2, Lock, FileText, Download, Eye, EyeOff } from 'lucide-react';")

input_pattern = r"""              <input
                required
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />"""

replacement = r"""              <input
                required
                type={showResetPassword ? "text" : "password"}
                placeholder="Enter new password (min 6 chars)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>"""

content = content.replace(input_pattern, replacement)

with open('src/pages/Members.tsx', 'w') as f:
    f.write(content)
