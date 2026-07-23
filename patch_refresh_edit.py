import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

pattern = r"setIsEditModalOpen\(false\);\s*setSelectedMember\(null\);"
replacement = """setIsEditModalOpen(false);
      setSelectedMember(null);
      window.dispatchEvent(new Event('dashboard-refresh'));"""

content = re.sub(pattern, replacement, content)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

