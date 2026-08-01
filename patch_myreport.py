with open('src/pages/MyReport.tsx', 'r') as f:
    content = f.read()

# 1. Update chapterUsers to exclude Master Admin
content = content.replace("""  const chapterUsers = useMemo(() => {
    return allUsersList.filter(u => String(u.chapter_id || u.chapterId || u.adminId) === String(userChapterId));
  }, [allUsersList, userChapterId]);""",
"""  const chapterUsers = useMemo(() => {
    return allUsersList.filter(u => {
      const isMaster = u.role === 'MASTER_ADMIN' || u.position === 'master_admin';
      if (isMaster) return false;
      return String(u.chapter_id || u.chapterId || u.adminId) === String(userChapterId);
    });
  }, [allUsersList, userChapterId]);""")

# 2. Update referrals / slips to check against chapterUsers, not allUsersList
content = content.replace("allUsersList.find", "chapterUsers.find")

# Wait, if we use chapterUsers.find, it means we only count referrals sent BY a chapter user.
# What about "referralsSentCount = chapterReferrals.filter(r => ...)"?
# It was:
#  const referralsSentCount = chapterReferrals.filter(r => {
#    const sender = allUsersList.find(u => (u.id || u.uid) === (r.fromUserId || r.sender_id));
#    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
#  }).length;
#
# Since chapterUsers only contains users in the chapter, we can simplify this!

with open('src/pages/MyReport.tsx', 'w') as f:
    f.write(content)
