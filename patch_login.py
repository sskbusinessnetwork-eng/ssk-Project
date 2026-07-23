import re

with open('src/pages/Login.tsx', 'r') as f:
    content = f.read()

# Remove auth_data lookup
pattern = r"if \(!storedPassword\) \{\s*const authDoc = await getDoc\(doc\(db, 'auth_data', uid\)\);\s*if \(authDoc\.exists\(\)\) \{\s*storedPassword = authDoc\.data\(\)\.password;\s*\}\s*\}"
content = re.sub(pattern, "", content)

with open('src/pages/Login.tsx', 'w') as f:
    f.write(content)
