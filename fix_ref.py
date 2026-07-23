import re

with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

old_ref = """  const effectiveUserChapterId = currentUserChapterId || profile?.chapter_id || (profile as any)?.chapterId;"""
new_ref = """  const currentUserRecord = useMemo(() => allMembers.find(m => m.uid === profile?.uid || m.id === profile?.uid), [allMembers, profile]);
  const effectiveUserChapterId = currentUserRecord?.chapter_id || currentUserChapterId || profile?.chapter_id || (profile as any)?.chapterId;"""
content = content.replace(old_ref, new_ref)

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)

