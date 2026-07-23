import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

pattern = r"setIsAddModalOpen\(false\);\s*setNewMemberData"
replacement = """setIsAddModalOpen(false);
      window.dispatchEvent(new Event('dashboard-refresh'));
      setNewMemberData"""

content = re.sub(pattern, replacement, content)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

