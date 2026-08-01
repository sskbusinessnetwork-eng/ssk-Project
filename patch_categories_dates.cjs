const fs = require('fs');
const file = 'src/pages/Categories.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldMap = `      // Map 'category_name' to 'name' for the UI, or just use as is
      const formatted = (data || []).map(c => ({
        ...c,
        name: c.category_name || c.name, // fallback
      }));`;

const newMap = `      // Map 'category_name' to 'name' and dates for the UI
      const formatted = (data || []).map(c => ({
        ...c,
        name: c.category_name || c.name, // fallback
        createdAt: c.created_at || c.createdAt,
        updatedAt: c.updated_at || c.updatedAt,
      }));`;

if (content.includes(oldMap)) {
  content = content.replace(oldMap, newMap);
  fs.writeFileSync(file, content);
  console.log("Categories dates patched.");
}
