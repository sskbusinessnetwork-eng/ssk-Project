with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

replacement = """<Avatar src={profile?.photoURL} name={profile?.name} size={isCollapsed ? "w-10 h-10" : "w-[48px] h-[48px]"} className="border border-[#1F2937] bg-[#111827] mx-auto" fallbackClassName="text-lg" />"""

import re
content = re.sub(r'<img\s+src=\{profile\?\.photoURL \|\| `https://ui-avatars\.com/api/\?name=\$\{encodeURIComponent\(profile\?\.name \|\| \'User\'\)\}&background=E53935&color=ffffff`\}\s+alt="Profile"\s+className=\{cn\("rounded-full border border-\[#1F2937\] object-cover bg-white", isCollapsed \? "w-10 h-10 mx-auto" : "w-\[48px\] h-\[48px\]"\)\}\s+referrerPolicy="no-referrer"\s+/>', replacement, content)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
