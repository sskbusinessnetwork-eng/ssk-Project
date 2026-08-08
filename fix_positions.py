import re

with open('src/pages/Positions.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Search, User, Phone, Mail", "import { Search, User, Phone, PhoneCall, Mail")

with open('src/pages/Positions.tsx', 'w') as f:
    f.write(content)
