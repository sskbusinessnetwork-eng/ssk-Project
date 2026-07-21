import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\} from \'lucide-react\';', ', AlertTriangle} from \'lucide-react\';', content, count=1)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
