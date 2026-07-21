import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"      setFormData\(\{ \n        participantId: '', \n        date: '', \n        time: '', \n        venue: '',\n        notes: '' \n      \}\);\n",
    r"      setFormData({ \n        participantId: '', \n        date: '', \n        time: '', \n        venue: '',\n        notes: '' \n      });\n      setLocationSelection('');\n",
    content
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
