import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

# Replace safeFetch call with local UID generation
pattern = r"// 2\. CREATE AUTH ACCOUNT\s*const data = await safeFetch\('/api/admin/create-user', \{.*?\n\s*\}\);\s*const \{ uid \} = data;"
replacement = """// 2. CREATE AUTH ACCOUNT
      const uid = 'auth_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
      """

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

