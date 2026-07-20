const fs = require('fs');

const file = 'src/types.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/adminId\?: string;\n\s+date: string;/g, "adminId?: string;\n  chapter_id?: string;\n  date: string;");

fs.writeFileSync(file, content);
