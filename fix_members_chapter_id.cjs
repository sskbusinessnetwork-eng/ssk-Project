const fs = require('fs');

const file = 'src/pages/Members.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace `chapter_id: profile?.uid,` with `chapter_id: profile?.chapter_id,`
content = content.replace(/chapter_id: profile\?\.uid,/g, "chapter_id: profile?.chapter_id,");

fs.writeFileSync(file, content);
