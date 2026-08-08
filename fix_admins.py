import re

with open('src/pages/Admins.tsx', 'r') as f:
    content = f.read()

content = content.replace("CheckCircle2 }", "CheckCircle2, Eye, EyeOff }")

with open('src/pages/Admins.tsx', 'w') as f:
    f.write(content)
