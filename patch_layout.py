with open('src/components/Layout.tsx', 'r') as f:
    content = f.read()

replacement = """<Avatar src={profile?.photoURL} name={profile?.name} size="w-12 h-12" className="border border-white/10 shadow-sm" fallbackClassName="text-lg" />"""

import re
content = re.sub(r'<img\s+src=\{profile\?\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(profile\?\.name \|\| \'User\'\)\}&background=DC2626&color=ffffff`\}\s+alt="Profile"\s+className="w-12 h-12 rounded-full border border-white/10 shadow-sm"\s+/>', replacement, content)

with open('src/components/Layout.tsx', 'w') as f:
    f.write(content)
