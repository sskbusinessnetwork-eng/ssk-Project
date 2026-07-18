const fs = require('fs');

let content = fs.readFileSync('src/lib/database.ts', 'utf8');

content = content.replace(/return \{ docs, empty: docs\.length === 0 \};/, 'return { docs, empty: docs.length === 0, forEach: (cb: any) => docs.forEach(cb) };');

fs.writeFileSync('src/lib/database.ts', content);
console.log('getDocs patched.');
