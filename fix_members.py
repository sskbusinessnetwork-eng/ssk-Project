import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import {  where, doc, setDoc, collection, query, getDocs, orderBy  } from '../lib/database';",
    "import {  where, doc, setDoc, addDoc, collection, query, getDocs, orderBy  } from '../lib/database';"
)

old_logic = """      // 2. CREATE AUTH ACCOUNT
      const uid = 'auth_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
      
      
      // 3. MEMBER DATA STRUCTURE
      const memberProfile = {
        uid: uid,
        name: newMemberData.name,
        role: "MEMBER",
        position: "member",
        phone: normalizedPhone,
        status: "ACTIVE",
        membershipStatus: "ACTIVE",
        password: bcrypt.hashSync(newMemberData.password, 10),
        must_change_password: true,
        mustChangePassword: true,
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        chapterName: finalChapterName,
        createdByName: adminProfile.name || 'Chapter Admin',
        createdByRole: "CHAPTER_ADMIN",
        whatsappNumber: normalizePhoneNumber(newMemberData.whatsapp),
        adminId: adminId,
        created_by: adminId,
        createdAt: new Date().toISOString(),
        subscriptionStart: new Date(newMemberData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(newMemberData.subscriptionEnd).toISOString(),
        subscriptionStartDate: new Date(newMemberData.subscriptionStart).toISOString().split('T')[0],
        subscriptionEndDate: new Date(newMemberData.subscriptionEnd).toISOString().split('T')[0],
        subscriptionStatus: new Date(newMemberData.subscriptionEnd) > new Date() ? "Active" : "Expired",
        subscriptionType: "Annual",
        renewalRequested: false
      };

      // 4. SAVE TO FIRESTORE
      await setDoc(doc(db, "users", uid), memberProfile);"""

new_logic = """      // 3. MEMBER DATA STRUCTURE
      const memberProfile = {
        name: newMemberData.name,
        role: "MEMBER",
        position: "member",
        phone: normalizedPhone,
        status: "ACTIVE",
        membershipStatus: "ACTIVE",
        password: bcrypt.hashSync(newMemberData.password, 10),
        must_change_password: true,
        mustChangePassword: true,
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        chapterName: finalChapterName,
        createdByName: adminProfile.name || 'Chapter Admin',
        createdByRole: "CHAPTER_ADMIN",
        whatsappNumber: normalizePhoneNumber(newMemberData.whatsapp),
        adminId: adminId,
        created_by: adminId,
        createdAt: new Date().toISOString(),
        subscriptionStart: new Date(newMemberData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(newMemberData.subscriptionEnd).toISOString(),
        subscriptionStartDate: new Date(newMemberData.subscriptionStart).toISOString().split('T')[0],
        subscriptionEndDate: new Date(newMemberData.subscriptionEnd).toISOString().split('T')[0],
        subscriptionStatus: new Date(newMemberData.subscriptionEnd) > new Date() ? "Active" : "Expired",
        subscriptionType: "Annual",
        renewalRequested: false
      };

      // 4. SAVE TO Supabase
      const res = await addDoc(collection(db, "users"), memberProfile);
      const newUserId = res.id;"""

content = content.replace(old_logic, new_logic)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)
