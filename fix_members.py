import re

with open('src/pages/Members.tsx', 'r') as f:
    content = f.read()

content = content.replace("CheckCircle2", "CheckCircle2,\n  Eye,\n  EyeOff")

with open('src/pages/Members.tsx', 'w') as f:
    f.write(content)
