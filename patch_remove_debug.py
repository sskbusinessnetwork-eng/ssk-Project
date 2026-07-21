import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'            <div className="text-white text-xs mb-4">\n              DEBUG: members length: \{members\.length\}, profile chapter: \{profile\?\.chapter_id \|\| \'N/A\'\}, isAdmin: \{isAdmin \? \'yes\' : \'no\'\}\n            </div>\n',
    '',
    content
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
