const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "link: has121Today ? '/one-to-one' : '/one-to-one',",
  "link: has121Today ? `/one-to-one?update=${today121[0]?.id}` : '/one-to-one',"
);

code = code.replace(
  "link: '/meetings',",
  "link: hasChapterToday ? `/meetings?update=${todayChapter[0]?.id}` : '/meetings',"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
