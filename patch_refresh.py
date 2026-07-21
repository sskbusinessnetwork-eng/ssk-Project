import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = content.replace("await databaseService.create('one_to_one_meetings', newMeeting);", "await databaseService.create('one_to_one_meetings', newMeeting);\n      window.dispatchEvent(new CustomEvent('dashboard-refresh'));")

content = content.replace("await databaseService.update('one_to_one_meetings', updatingMeeting.id, {", "await databaseService.update('one_to_one_meetings', updatingMeeting.id, {")
# let's just use regex for the update one
content = re.sub(
    r"(await databaseService\.update\('one_to_one_meetings', updatingMeeting\.id, \{[^}]+\}\);)",
    r"\1\n      window.dispatchEvent(new CustomEvent('dashboard-refresh'));",
    content
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)

