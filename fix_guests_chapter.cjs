const fs = require('fs');

const file = 'src/pages/Guests.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/chapter_id: profile\.adminId \|\| null,/g, "chapter_id: profile?.chapter_id || null,");
fs.writeFileSync(file, content);
