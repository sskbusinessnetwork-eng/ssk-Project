import re

with open("src/pages/Admins.tsx", "r") as f:
    content = f.read()

old_logic = """      } else {
        // 1. Create in Auth via API
        const uid = 'auth_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);

        // 2. Create Firestore Profile
        const newAdmin: UserProfile = {
          uid,
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          chapterName: formData.chapterName,
          businessName: formData.businessName,
          role: 'CHAPTER_ADMIN',
          membershipStatus: formData.membershipStatus,
          subscriptionStartDate: new Date().toISOString().split('T')[0],
          subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          subscriptionStatus: 'Active',
          subscriptionType: 'Annual',
          renewalRequested: false,
          createdAt: new Date().toISOString()
        };
        await databaseService.create('users', newAdmin, uid);
        setSuccess('Admin created successfully!');
      }"""

new_logic = """      } else {
        // 2. Create Firestore Profile
        const newAdmin: any = {
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          chapterName: formData.chapterName,
          businessName: formData.businessName,
          role: 'CHAPTER_ADMIN',
          membershipStatus: formData.membershipStatus,
          subscriptionStartDate: new Date().toISOString().split('T')[0],
          subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          subscriptionStatus: 'Active',
          subscriptionType: 'Annual',
          renewalRequested: false,
          createdAt: new Date().toISOString()
        };
        await databaseService.create('users', newAdmin);
        setSuccess('Admin created successfully!');
      }"""

content = content.replace(old_logic, new_logic)

with open("src/pages/Admins.tsx", "w") as f:
    f.write(content)
