const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/onCardClick=\{\(label\) => \{\s*setAnalyticsModalCategory\(label\);\s*\}\}/, `onCardClick={(label) => {
              if (profile?.role === 'MASTER_ADMIN' || isChapterAdminUser) {
                setAnalyticsModalCategory(label);
              }
            }}`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
