import re

with open('src/pages/Profile.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { \n  User, \n  Briefcase, \n  Phone, ", "import { \n  User, \n  Briefcase, \n  Phone, \n  PhoneCall, ")

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(content)
