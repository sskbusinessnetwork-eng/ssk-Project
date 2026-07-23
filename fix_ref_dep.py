import re

with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

content = content.replace("}, [profile, filter]);", "}, [profile, filter, memberFilter]);")

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)
