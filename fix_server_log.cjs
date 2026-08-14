const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/if \(updateErr\) {/g, 'if (updateErr) { console.error("SUPABASE UPDATE ERR:", updateErr);');
fs.writeFileSync('server.ts', code);
