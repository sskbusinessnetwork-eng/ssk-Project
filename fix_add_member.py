import re

with open("src/components/members/AddMemberForm.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import {  collection, query, where, getDocs, doc, setDoc  } from '../../lib/database';",
    "import {  collection, query, where, getDocs, doc, setDoc, addDoc  } from '../../lib/database';"
)

old_logic = """      // 2. Generate unique Member ID
      const memberId = 'SSK' + Math.floor(10000 + Math.random() * 90000).toString();
      const uid = 'auth_' + Math.random().toString(36).substring(2, 11);

      // 3. Create User Profile
      const newMember = {
        id: uid,
        uid: uid,
        memberId: memberId,
        name: formData.fullName.trim(),
        phone: cleanPhone,
        whatsappNumber: normalizePhoneNumber(formData.whatsapp),
        
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        chapterName: finalChapterName,
        role: 'MEMBER',
        position: 'member' as any, // translates to 'Associate Member' in display
        membershipStatus: 'ACTIVE' as any,
        subscriptionStart: new Date(formData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(formData.subscriptionEnd).toISOString(),
        subscriptionStartDate: formData.subscriptionStart,
        subscriptionEndDate: formData.subscriptionEnd,
        subscriptionStatus: new Date(formData.subscriptionEnd) > new Date() ? 'Active' : 'Expired',
        must_change_password: true,
        created_by: adminId,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), newMember);"""

new_logic = """      // 2. Generate unique Member ID
      const memberId = 'SSK' + Math.floor(10000 + Math.random() * 90000).toString();

      // 3. Create User Profile
      const newMember = {
        memberId: memberId,
        name: formData.fullName.trim(),
        phone: cleanPhone,
        whatsappNumber: normalizePhoneNumber(formData.whatsapp),
        
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        chapterName: finalChapterName,
        role: 'MEMBER',
        position: 'member' as any, // translates to 'Associate Member' in display
        membershipStatus: 'ACTIVE' as any,
        subscriptionStart: new Date(formData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(formData.subscriptionEnd).toISOString(),
        subscriptionStartDate: formData.subscriptionStart,
        subscriptionEndDate: formData.subscriptionEnd,
        subscriptionStatus: new Date(formData.subscriptionEnd) > new Date() ? 'Active' : 'Expired',
        must_change_password: true,
        created_by: adminId,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users'), newMember);"""

content = content.replace(old_logic, new_logic)

with open("src/components/members/AddMemberForm.tsx", "w") as f:
    f.write(content)
