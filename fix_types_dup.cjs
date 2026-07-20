const fs = require('fs');

const file = 'src/types.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/  chapter_id\?: string;\n  chapter_id\?: string;/g, "  chapter_id?: string;");
fs.writeFileSync(file, content);
