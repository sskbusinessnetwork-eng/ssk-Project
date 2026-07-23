import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_conn = """  const filteredMembers = members.filter(member => {
    // 1. Tab Filtering
    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (!memberChapId) return false;
        return memberChapId === selectedChap;
      } else {
        const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (!memberChapId) return false;
        return myChapId === memberChapId;
      }
    }"""
new_conn = """  const filteredMembers = members.filter(member => {
    // 1. Tab Filtering
    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = String(masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = String(member.chapter_id || '').trim();
        if (!memberChapId) return false;
        if (memberChapId !== selectedChap) return false;
      } else {
        const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;
        const memberChapId = String(member.chapter_id || '').trim();
        if (!memberChapId) return false;
        if (myChapId !== memberChapId) return false;
      }
    }"""
content = content.replace(old_conn, new_conn)

old_conn_count = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      if (!selectedChap) return false;
      const memberChapId = (m.chapter_id || '').trim();
      return memberChapId === selectedChap;
    } else {
      const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
      if (!myChapId) return false;
      const memberChapId = (m.chapter_id || '').trim();
      if (!memberChapId) return false;
      return myChapId === memberChapId;
    }
  }).length;"""
new_conn_count = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = String(masterSelectedChapterId || '').trim();
      if (!selectedChap) return false;
      const memberChapId = String(m.chapter_id || '').trim();
      return memberChapId === selectedChap;
    } else {
      const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
      if (!myChapId) return false;
      const memberChapId = String(m.chapter_id || '').trim();
      if (!memberChapId) return false;
      return myChapId === memberChapId;
    }
  }).length;"""
content = content.replace(old_conn_count, new_conn_count)
with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)

