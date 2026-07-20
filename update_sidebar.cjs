const fs = require('fs');

const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\{ icon: Activity, label: 'Reports', path: '\/reports', roles: \['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'\] \},/,
  "{ icon: Activity, label: 'Reports', path: '/reports', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },"
);

fs.writeFileSync(file, content);
