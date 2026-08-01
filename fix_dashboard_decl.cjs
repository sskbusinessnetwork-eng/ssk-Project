const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  const activeDateRange = useMemo(() => {
    if (activeDateRange) return activeDateRange;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  }, [activeDateRange]);`,
  ``
);

// We should also replace the double activeDateRange: activeDateRange that might have happened:
content = content.replace(/activeDateRange: activeDateRange/g, 'activeDateRange');

fs.writeFileSync(file, content);
console.log("Fixed decl.");
