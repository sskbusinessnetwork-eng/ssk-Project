import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('User} from \'lucide-react\';', 'User, AlertTriangle} from \'lucide-react\';')

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
