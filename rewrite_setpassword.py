import re

with open('src/pages/SetPassword.tsx', 'r') as f:
    content = f.read()

# Add states
state_pattern = re.compile(r'  const \[loading, setLoading\] = useState\(false\);')
state_replacement = r"""  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);"""
content = re.sub(state_pattern, state_replacement, content)

# Also import Eye and EyeOff if not already imported
if 'EyeOff' not in content:
    content = content.replace("import { Lock, AlertCircle } from 'lucide-react';", "import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';")
else:
    # Ensure Eye and EyeOff are in the lucide-react import
    pass

input1 = r"""              <input
                type="password"
                value={currentPassword}"""
replace1 = r"""              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}"""

content = content.replace(input1, replace1)

# we need to close the div and add the icon
input1_end = r"""                placeholder="Enter current password"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.currentPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />"""
replace1_end = r"""                placeholder="Enter current password"
                className={`w-full h-[50px] px-4 pr-12 bg-[#0F172A] border ${errors.currentPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>"""

content = content.replace(input1_end, replace1_end)


input2 = r"""              <input
                type="password"
                value={newPassword}"""
replace2 = r"""              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}"""
content = content.replace(input2, replace2)

input2_end = r"""                placeholder="Min. 8 chars, upper, lower, number, special"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.newPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />"""
replace2_end = r"""                placeholder="Min. 8 chars, upper, lower, number, special"
                className={`w-full h-[50px] px-4 pr-12 bg-[#0F172A] border ${errors.newPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>"""
content = content.replace(input2_end, replace2_end)

input3 = r"""              <input
                type="password"
                value={confirmPassword}"""
replace3 = r"""              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}"""
content = content.replace(input3, replace3)

input3_end = r"""                placeholder="Repeat new password"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />"""
replace3_end = r"""                placeholder="Repeat new password"
                className={`w-full h-[50px] px-4 pr-12 bg-[#0F172A] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>"""
content = content.replace(input3_end, replace3_end)

with open('src/pages/SetPassword.tsx', 'w') as f:
    f.write(content)
