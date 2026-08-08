import re

with open('src/components/members/EditMemberModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("Lock, HelpCircle } from 'lucide-react';", "Lock, HelpCircle, Eye, EyeOff } from 'lucide-react';")

with open('src/components/members/EditMemberModal.tsx', 'w') as f:
    f.write(content)
