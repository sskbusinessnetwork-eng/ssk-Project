import re

with open('src/pages/Guests.tsx', 'r') as f:
    content = f.read()

content = content.replace("  CheckCircle2,\n  Phone\n} from 'lucide-react';", "  CheckCircle2,\n  Phone,\n  PhoneCall\n} from 'lucide-react';")

with open('src/pages/Guests.tsx', 'w') as f:
    f.write(content)
