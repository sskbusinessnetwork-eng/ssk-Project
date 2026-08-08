import re

with open('src/pages/OnboardMember.tsx', 'r') as f:
    content = f.read()

content = content.replace("User, Phone, Mail, CheckCircle,", "User, Phone, PhoneCall, Mail, CheckCircle,")

with open('src/pages/OnboardMember.tsx', 'w') as f:
    f.write(content)
