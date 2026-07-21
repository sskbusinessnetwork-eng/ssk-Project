import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

content = content.replace("applyQueryConstraints(builder, finalConstraints, meetingIdsFiltered)", "applyConstraints(builder, finalConstraints, meetingIdsFiltered)")
with open('src/lib/database.ts', 'w') as f:
    f.write(content)
