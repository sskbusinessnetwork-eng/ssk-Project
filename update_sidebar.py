import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

import_statement = "CreditCard"
if 'CreditCard' not in content:
    content = content.replace("LogOut,", "LogOut, CreditCard,")
    
menu_item = "    { icon: CreditCard, label: 'Manage Subscriptions', path: '/subscriptions', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },\n"
if 'Manage Subscriptions' not in content:
    content = content.replace("    { icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN'] },\n", 
                              "    { icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN'] },\n" + menu_item)

    with open('src/components/Sidebar.tsx', 'w') as f:
        f.write(content)
