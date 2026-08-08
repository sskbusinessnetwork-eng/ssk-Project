import re

with open('src/pages/Members.tsx', 'r') as f:
    content = f.read()

# Members.tsx has multiline import for lucide-react.
# Find it:
import_pattern = re.compile(r"import \{(.*?)\} from 'lucide-react';", re.DOTALL)

def repl(m):
    inner = m.group(1)
    if "Eye" not in inner:
        inner += "  Eye,\n  EyeOff,\n"
    return f"import {{{inner}}} from 'lucide-react';"

content = re.sub(import_pattern, repl, content)

with open('src/pages/Members.tsx', 'w') as f:
    f.write(content)
