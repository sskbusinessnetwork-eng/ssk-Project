const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const { error: updateErr } = await adminSupabase',
  'console.log("UPDATE PAYLOAD:", updatePayload);\n      const { error: updateErr } = await adminSupabase'
);

code = code.replace(
  'if (updateErr) {',
  'if (updateErr) {\n        console.error("SUPABASE UPDATE ERROR:", updateErr);'
);

fs.writeFileSync('server.ts', code);
