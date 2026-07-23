import re

files_to_patch = ["src/pages/Members.tsx", "src/pages/Admins.tsx"]

for filepath in files_to_patch:
    with open(filepath, "r") as f:
        content = f.read()

    # We will just strip out any call to safeFetch
    content = re.sub(r"await safeFetch\('/api/admin/update-user', \{.*?\n\s*\}\);", "/* No need to call update-user API */", content, flags=re.DOTALL)
    content = re.sub(r"await safeFetch\('/api/auth/delete-user', \{.*?\n\s*\}\);", "/* Deleted via DB directly below */", content, flags=re.DOTALL)
    
    with open(filepath, "w") as f:
        f.write(content)

