const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Initial State
content = content.replace(
  `const [filterStartDate, setFilterStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);`,
  `const [filterStartDate, setFilterStartDate] = useState<string>('');`
);

content = content.replace(
  `const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);`,
  `const [filterEndDate, setFilterEndDate] = useState<string>('');`
);

content = content.replace(
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  });`,
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const effectiveDateRange = useMemo(() => {
    if (activeDateRange) return activeDateRange;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  }, [activeDateRange]);`
);

// 2. handleClearFilter
content = content.replace(
  `const handleClearFilter = () => {
    setFilterStartDate(new Date().toISOString().split('T')[0]);
    setFilterEndDate(new Date().toISOString().split('T')[0]);
    setSelectedChapterFilter('ALL');
    setSelectedMemberFilter('ALL');
    setAppliedChapterFilter('ALL');
    setAppliedMemberFilter('ALL');
    setDateError(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setActiveDateRange({ start: today, end: end });
  };`,
  `const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedChapterFilter('ALL');
    setSelectedMemberFilter('ALL');
    setAppliedChapterFilter('ALL');
    setAppliedMemberFilter('ALL');
    setDateError(null);
    setActiveDateRange(null);
  };`
);

// 3. Replace in useMemo blocks
// We can do this with regex replacing "activeDateRange" with "effectiveDateRange" between lines 415 and 1550
const lines = content.split('\n');
for (let i = 410; i < 1550; i++) {
  if (lines[i] && lines[i].includes('activeDateRange')) {
    lines[i] = lines[i].replace(/activeDateRange/g, 'effectiveDateRange');
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Dashboard patched.");
