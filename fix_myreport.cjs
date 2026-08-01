const fs = require('fs');
const file = 'src/pages/MyReport.tsx';
let content = fs.readFileSync(file, 'utf8');

// Restore MyReport's date states completely
content = content.replace(
  `const [filterStartDate, setFilterStartDate] = useState('');`,
  `const [filterStartDate, setFilterStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);`
);
content = content.replace(
  `const [filterEndDate, setFilterEndDate] = useState('');`,
  `const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);`
);
content = content.replace(
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);`,
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  });`
);
content = content.replace(
  `  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveDateRange(null);
    setIsFilterModalOpen(false);
  };`,
  `  const handleClearFilter = () => {
    setFilterStartDate(new Date().toISOString().split('T')[0]);
    setFilterEndDate(new Date().toISOString().split('T')[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setActiveDateRange({ start: today, end: end });
    setIsFilterModalOpen(false);
  };`
);

fs.writeFileSync(file, content);
console.log("Restored MyReport completely.");
