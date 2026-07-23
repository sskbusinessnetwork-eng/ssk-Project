import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("passwordStatus: pwdStatus,", "passwordStatus: 'Not Applicable',")

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
