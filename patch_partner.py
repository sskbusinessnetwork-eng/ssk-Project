import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = content.replace("meeting.creatorId", "(meeting.organizer_id || meeting.creatorId)")
content = content.replace("meeting.participantIds[0]", "(meeting.member_id || (meeting.participantIds && meeting.participantIds[0]))")
content = content.replace("meeting.participantIds.map", "([meeting.member_id || (meeting.participantIds && meeting.participantIds[0])].filter(Boolean)).map")
content = content.replace("meeting.participantIds.length", "1")

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)

