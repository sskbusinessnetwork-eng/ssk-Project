import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add AlertTriangle to imports
if 'AlertTriangle' not in content:
    content = content.replace('import { CheckSquare, Clock, Handshake, Users, Shield, Calendar, Share2, UserPlus, User, CheckCircle2, DollarSign, Target, Activity, Zap } from \'lucide-react\';',
                              'import { CheckSquare, Clock, Handshake, Users, Shield, Calendar, Share2, UserPlus, User, CheckCircle2, DollarSign, Target, Activity, Zap, AlertTriangle } from \'lucide-react\';')
    
    # If the above line doesn't exist exactly, just do a more general replace
    content = re.sub(r'import \{(.*?)\} from \'lucide-react\';', lambda m: f"import {{{m.group(1)}, AlertTriangle}} from 'lucide-react';" if 'AlertTriangle' not in m.group(1) else m.group(0), content, count=1)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

with open('src/components/MasterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

# Add tasks to props type
if 'tasks?: any[];' not in content:
    content = content.replace(
        'leadershipStats?: { chapterAdmins: number; presidents: number; vicePresidents: number; treasurers: number; };',
        'leadershipStats?: { chapterAdmins: number; presidents: number; vicePresidents: number; treasurers: number; };\n  tasks?: any[];'
    )
    
with open('src/components/MasterAdminCompanionView.tsx', 'w') as f:
    f.write(content)

