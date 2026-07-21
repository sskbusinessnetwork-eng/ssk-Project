import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# Remove useEffect early return
content = re.sub(
    r"    if \(!profile\) return;\n    if \(profile\.role \!\=\= 'MEMBER' \&\& profile\.role \!\=\= 'MASTER_ADMIN' \&\& profile\.role \!\=\= 'CHAPTER_ADMIN'\) return;\n",
    r"    if (!profile) return;\n",
    content
)

# Remove component body early return
content = re.sub(
    r"  if \(profile\?\.role \!\=\= 'MEMBER' \&\& profile\?\.role \!\=\= 'MASTER_ADMIN' \&\& profile\?\.role \!\=\= 'CHAPTER_ADMIN'\) \{\n    return \(\n      <div className=\"min-h-screen pt-20 px-4 flex items-center justify-center\">\n        <div className=\"text-center space-y-4\">\n          <h2 className=\"text-2xl font-bold text-white\">Access Denied</h2>\n          <p className=\"text-neutral-400\">You do not have permission to view one-to-one meetings\.</p>\n        </div>\n      </div>\n    \);\n  \}",
    "",
    content
)

# Just in case the format is slightly different:
content = re.sub(
    r"  if \(profile\?\.role \!\=\= 'MEMBER' [^}]*\}\n",
    "",
    content
)


with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
