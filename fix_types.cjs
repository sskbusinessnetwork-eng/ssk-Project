const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  "  isApproved?: boolean;",
  "  isApproved?: boolean;\n  workspace_checklist?: Record<string, boolean>;\n  growth_score?: number;"
);
fs.writeFileSync('src/types.ts', code);
