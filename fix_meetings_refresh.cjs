const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

code = code.replace(
  "const { profile } = useAuth();",
  "const { profile, refreshProfile } = useAuth();"
);

code = code.replace(
  "window.dispatchEvent(new CustomEvent('dashboard-refresh'));",
  "await refreshProfile();\n      window.dispatchEvent(new CustomEvent('dashboard-refresh'));"
);

fs.writeFileSync('src/pages/Meetings.tsx', code);
