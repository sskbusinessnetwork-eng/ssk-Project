import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "['meetings', 'testimonials', 'guest_invitations', 'guest_registrations'].includes(collectionPath)",
    "['meetings', 'testimonials', 'guest_invitations', 'guest_registrations', 'one_to_one_meetings'].includes(collectionPath)"
)

with open('src/lib/database.ts', 'w') as f:
    f.write(content)

