import re

with open("src/pages/Admins.tsx", "r") as f:
    content = f.read()

pattern = r"const data = await safeFetch\('/api/admin/create-user', \{.*?\n\s*\}\);\s*const \{ uid \} = data;"
replacement = """const uid = 'auth_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("src/pages/Admins.tsx", "w") as f:
    f.write(content)

