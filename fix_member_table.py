import re

with open('src/components/members/MemberTable.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { PhoneCall, ", "import { ")

content = content.replace("import { Avatar } from '../../components/Avatar';", "import { Avatar } from '../../components/Avatar';")
content = content.replace("import { Phone,", "import { PhoneCall, Phone,")

with open('src/components/members/MemberTable.tsx', 'w') as f:
    f.write(content)
