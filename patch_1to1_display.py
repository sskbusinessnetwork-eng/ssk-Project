import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# Replace meeting.date with the fallback
content = content.replace("format(new Date(meeting.date), 'dd MMM yyyy')", "format(new Date(meeting.scheduled_date || meeting.date), 'dd MMM yyyy')")

# For the time, it's formatTime12h(meeting.time)
# For scheduled_date we can format it from Date object if time is not present
content = content.replace("formatTime12h(meeting.time)", "(meeting.time ? formatTime12h(meeting.time) : format(new Date(meeting.scheduled_date || ''), 'hh:mm a'))")

# For isOverdue
content = content.replace("isAfter(new Date(), new Date(meeting.date + 'T23:59:59'))", "isAfter(new Date(), meeting.scheduled_date ? new Date(meeting.scheduled_date) : new Date(meeting.date + 'T23:59:59'))")

# The partner name is extracted from meeting.participantIds?
# Let's check how partner name is shown
