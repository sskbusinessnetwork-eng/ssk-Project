const fs = require('fs');
let content = fs.readFileSync('src/pages/Positions.tsx', 'utf8');

// I will just revert to standard and re-do cleanly.
content = content.replace(/\/\/ Dummy useEffect block to safely overwrite the old one below[\s\S]*?\} \}, \[\]\);/m, 
`  }, [isMasterAdmin, profile?.uid]);`);
content = content.replace(/\} \}, \[\]\);/g, "");
content = content.replace(/  \/\/ eslint-disable-next-line\n  \} \}, \[\]\);\n  \n  \/\/ Dummy useEffect block to safely overwrite the old one below\n  useEffect\(\(\) => \{ if \(false\) \{\n    if \(isMasterAdmin\) \{\n      const q = query\(collection\(db, 'chapters'\)\);\n      getDocs\(q\)\.then\(snap => \{\n        setChapters\(snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \} as Chapter\)\)\);\n      \}\);\n    \} else if \(profile\?\.uid\) \{\n      \/\/ For Chapter Admin\n      const q = query\(collection\(db, 'chapters'\), where\('chapter_admin_id', '==', profile\.uid\)\);\n      getDocs\(q\)\.then\(snap => \{\n        const found = snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \} as Chapter\)\);\n        setChapters\(found\);\n        if \(found\.length > 0\) \{\n          setSelectedChapterId\(found\[0\]\.id\);\n        \}\n      \}\);\n    \}\n  \} \}, \[\]\);/m, "  }, [isMasterAdmin, profile?.uid]);");

fs.writeFileSync('src/pages/Positions.tsx', content);
