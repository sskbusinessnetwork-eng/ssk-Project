import re

files_to_patch = ["src/pages/Members.tsx", "src/pages/Admins.tsx"]

for filepath in files_to_patch:
    with open(filepath, "r") as f:
        content = f.read()

    # Remove safeFetch for update-user
    pattern_update = r"await safeFetch\('/api/admin/update-user', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application/json' \},\s*body: JSON\.stringify\((.*?)\)\s*\}\);"
    # For Members.tsx
    content = re.sub(pattern_update, r"/* No need to call update-user API, we update DB directly */", content)

    # Remove safeFetch for delete-user
    pattern_delete = r"await safeFetch\('/api/auth/delete-user', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application/json' \},\s*body: JSON\.stringify\(\{ uid(.*?)\} \)\s*\}\);"
    content = re.sub(pattern_delete, r"/* Deleted via DB directly below */", content)
    
    with open(filepath, "w") as f:
        f.write(content)

