import re
with open('src/pages/Admins.tsx', 'r') as f:
    content = f.read()

disabled_str = 'disabled={!!editingAdmin && editingAdmin.uid !== profile?.uid}'
class_str = 'className={`w-full px-4 py-3 rounded-[12px] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${!!editingAdmin && editingAdmin.uid !== profile?.uid ? "bg-neutral-100 text-neutral-500 cursor-not-allowed" : ""}`}'

# Just replace the className for those specific inputs and add the disabled prop.
# Full Name
content = re.sub(
    r'(placeholder="Enter admin\'s full name"\s*)className="w-full px-4 py-3 rounded-\[12px\] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"',
    r'\1 ' + disabled_str + '\n                ' + class_str,
    content
)

# Phone Number
content = re.sub(
    r'(placeholder="e\.g\. 9876543210"\s*)className="w-full px-4 py-3 rounded-\[12px\] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"',
    r'\1 ' + disabled_str + '\n                  ' + class_str,
    content
)

# Email Address
content = re.sub(
    r'(placeholder="admin@example\.com"\s*)className="w-full px-4 py-3 rounded-\[12px\] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"',
    r'\1 ' + disabled_str + '\n                  ' + class_str,
    content
)

# Business Name
content = re.sub(
    r'(placeholder="Enter business name"\s*)className="w-full px-4 py-3 rounded-\[12px\] border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"',
    r'\1 ' + disabled_str + '\n                ' + class_str,
    content
)

with open('src/pages/Admins.tsx', 'w') as f:
    f.write(content)
