import re

with open('src/pages/Members.tsx', 'r') as f:
    content = f.read()

content = content.replace("CheckCircle2,\n  Eye,\n  EyeOff", "CheckCircle2")

# Now properly replace the import
content = content.replace("import { Plus, Search, MapPin, Briefcase, X, Phone, UserCheck, UserMinus, UserPlus, CreditCard, Shield, AlertTriangle, User, Calendar, Edit2, Lock, FileText, Download, Eye, EyeOff } from 'lucide-react';", "import { Plus, Search, MapPin, Briefcase, X, Phone, UserCheck, UserMinus, UserPlus, CreditCard, Shield, AlertTriangle, User, Calendar, Edit2, Lock, FileText, Download, Eye, EyeOff, CheckCircle2 } from 'lucide-react';")

# Just to be sure we do it safely:
import_pattern = r"import { (.*)CheckCircle2(.*) } from 'lucide-react';"

def repl(m):
    return "import { " + m.group(1) + "CheckCircle2, Eye, EyeOff" + m.group(2) + " } from 'lucide-react';"

# First let's check if Eye is already imported
if "Eye," not in content:
    content = re.sub(import_pattern, repl, content)

with open('src/pages/Members.tsx', 'w') as f:
    f.write(content)
