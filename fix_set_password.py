import re

with open('src/pages/SetPassword.tsx', 'r') as f:
    content = f.read()

content = content.replace("Lock, ShieldAlert,", "Lock, ShieldAlert, Eye, EyeOff,")

with open('src/pages/SetPassword.tsx', 'w') as f:
    f.write(content)
