import re

with open("src/pages/OnboardMember.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import {  collection, doc, setDoc, query, where, getDocs, updateDoc  } from '../lib/database';",
    "import {  collection, doc, setDoc, addDoc, query, where, getDocs, updateDoc  } from '../lib/database';"
)

old_logic = """        const memberId = generateMemberId();
        const uid = 'auth_' + Math.random().toString(36).substring(2, 11);
        
        const newMember = {
          uid,
          memberId,
          name: formData.fullName,
          category: formData.category,
          phone: formData.phone,
          whatsappNumber: formData.whatsapp,
          email: formData.email,
          chapter_id: formData.chapterId,
          role: 'MEMBER',
          position: 'member' as ChapterPosition,
          membershipStatus: formData.status as 'ACTIVE' | 'SUSPENDED' | 'PENDING',
          must_change_password: true,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid), newMember);"""

new_logic = """        const memberId = generateMemberId();
        
        const newMember = {
          memberId,
          name: formData.fullName,
          category: formData.category,
          phone: formData.phone,
          whatsappNumber: formData.whatsapp,
          email: formData.email,
          chapter_id: formData.chapterId,
          role: 'MEMBER',
          position: 'member' as ChapterPosition,
          membershipStatus: formData.status as 'ACTIVE' | 'SUSPENDED' | 'PENDING',
          must_change_password: true,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'users'), newMember);"""

content = content.replace(old_logic, new_logic)

with open("src/pages/OnboardMember.tsx", "w") as f:
    f.write(content)
