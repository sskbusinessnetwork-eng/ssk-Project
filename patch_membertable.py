import re
with open('src/components/members/MemberTable.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "interface MemberTableProps {\n  members: UserProfile[];",
    "interface MemberTableProps {\n  currentUserId?: string;\n  members: UserProfile[];"
)

content = content.replace(
    "export function MemberTable({\n  members,",
    "export function MemberTable({\n  currentUserId,\n  members,"
)

# Desktop view
content = re.sub(
    r'(<button\s+onClick=\{\(\) => onEditMember\(member\)\}\s+className="w-full px-4 py-2 text-left text-xs font-bold text-neutral-200 hover:bg-\[\#1C2538\] flex items-center gap-2"\s*>\s*<Edit2 size=\{12\} className="text-neutral-400" />\s*Edit Profile\s*</button>)',
    r'{currentUserId === member.uid && (\1)}',
    content
)

# Mobile view
content = re.sub(
    r'(<button\s+onClick=\{\(\) => onEditMember\(member\)\}\s+className="h-8 px-2\.5 bg-\[\#151C2E\] text-neutral-200 rounded-lg text-\[10px\] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-\[\#1C2538\]"\s*>\s*<Edit2 size=\{10\} />\s*Edit\s*</button>)',
    r'{currentUserId === member.uid && (\1)}',
    content
)

with open('src/components/members/MemberTable.tsx', 'w') as f:
    f.write(content)
