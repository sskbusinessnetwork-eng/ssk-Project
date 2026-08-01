const fs = require('fs');
const file = 'src/components/TopPerformingMembersSection.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<Crown size={14} className="animate-pulse" />',
  '<Crown className="w-3.5 h-3.5 animate-pulse" />'
);
content = content.replace(
  '<Award size={14} />',
  '<Award className="w-3.5 h-3.5" />'
);
content = content.replace(
  '<Star size={14} />',
  '<Star className="w-3.5 h-3.5" />'
);

fs.writeFileSync(file, content);
console.log("Fixed TopPerformingMembersSection icons");
