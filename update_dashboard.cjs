const fs = require('fs');

const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace logic for chapter name
content = content.replace(/const adminId = profile\.chapter_id \|\| profile\.adminId;\n\s+if \(adminId\) \{\n\s+const adminProfile = await databaseService\.get<any>\('users', adminId\);\n\s+if \(adminProfile && adminProfile\.chapterName\) \{\n\s+setResolvedChapterName\(adminProfile\.chapterName\);\n\s+\} else \{\n\s+setResolvedChapterName\('My Chapter'\);\n\s+\}\n\s+\} else \{\n\s+setResolvedChapterName\('My Chapter'\);\n\s+\}/,
`if (profile.chapter_id) {
          const chapter = await databaseService.get<any>('chapters', profile.chapter_id);
          if (chapter && chapter.chapter_name) {
            setResolvedChapterName(chapter.chapter_name);
          } else {
            setResolvedChapterName('My Chapter');
          }
        } else {
          setResolvedChapterName('My Chapter');
        }`);

content = content.replace(/let userConstraints: any\[\] = \[\];\n\s+if \(profile\.role === 'CHAPTER_ADMIN'\) \{\n\s+userConstraints = \[where\('chapter_id', '==', profile\?\.chapter_id\)\];\n\s+\} else if \(profile\.role === 'MEMBER'\) \{\n\s+const adminId = profile\.chapter_id \|\| profile\.adminId;\n\s+if \(adminId\) \{\n\s+userConstraints = \[where\('chapter_id', '==', adminId\)\];\n\s+\}\n\s+\}/, 
`let userConstraints: any[] = [];
    if (profile.role === 'CHAPTER_ADMIN' || profile.role === 'MEMBER') {
      if (profile.chapter_id) {
         userConstraints = [where('chapter_id', '==', profile.chapter_id)];
      }
    }`);

content = content.replace(/meetings\.filter\(m => m\.adminId === \(profile\?\.chapter_id \|\| profile\?\.adminId \|\| profile\?\.uid\)\)/g, "meetings.filter(m => m.chapter_id === profile?.chapter_id)");
content = content.replace(/meetings\.filter\(m => m\.adminId === profile\.adminId\)/g, "meetings.filter(m => m.chapter_id === profile.chapter_id)");

fs.writeFileSync(file, content);
