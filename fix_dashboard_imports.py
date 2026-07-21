with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add import { format, addYears } from 'date-fns' if not exists
if 'date-fns' not in content:
    content = "import { format, addYears } from 'date-fns';\n" + content

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
