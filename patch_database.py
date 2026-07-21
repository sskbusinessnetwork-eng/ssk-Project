import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

# Remove specific one_to_one_meetings custom logic

# 1. participantIds filtering
content = re.sub(
    r"if \(collectionPath === 'one_to_one_meetings'\) \{.*?(?=if \(collectionPath === 'users'\))",
    "",
    content,
    flags=re.DOTALL
)

with open('src/lib/database.ts', 'w') as f:
    f.write(content)
