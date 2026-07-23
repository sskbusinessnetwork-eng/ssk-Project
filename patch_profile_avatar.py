with open('src/pages/Profile.tsx', 'r') as f:
    content = f.read()

import re

# Block 1
replacement1 = """<Avatar src={targetProfile.photoURL} name={targetProfile.name} size="w-24 h-24" className="" />"""
content = re.sub(r'<div className="w-24 h-24 rounded-full bg-\[#151C2E\] mx-auto border-4 border-\[#111827\] shadow-\[0_1px_3px_rgba\(0,0,0,0\.02\)\] overflow-hidden">\s*<img\s*src=\{targetProfile\.photoURL \|\| `https://picsum\.photos/seed/\$\{targetProfile\.uid\}/200/200`\}\s*className="w-full h-full object-cover"\s*referrerPolicy="no-referrer"\s*/>\s*</div>', replacement1, content)

# Block 2
replacement2 = """<Avatar src={formData.photoURL} name={formData.name} size="w-full h-full" className="" />"""
content = re.sub(r'\{formData\.photoURL \? \(\s*<img\s*src=\{formData\.photoURL\}\s*className="w-full h-full object-cover"\s*referrerPolicy="no-referrer"\s*/>\s*\) : \(\s*<div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">\s*<Camera size=\{28\} className="mb-2 opacity-50" />\s*<span className="text-\[10px\] font-medium tracking-wide">PHOTO</span>\s*</div>\s*\)\}', replacement2, content)

# Also need to import Avatar
if 'import { Avatar }' not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('import '):
            lines.insert(i, "import { Avatar } from '../components/Avatar';")
            break
    content = '\n'.join(lines)

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(content)
