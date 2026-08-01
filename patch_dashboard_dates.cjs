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

// 3. Replace activeDateRange with effectiveDateRange in filtering logic
const lines = content.split('\n');
const newLines = [];
let insideEffectiveReferrals = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (
    line.includes('if (activeDateRange) {') && 
    (
      lines[i+1].includes('isDateInRange') || 
      lines[i+1].includes('chapterUsers.filter') ||
      lines[i-1].includes('const effective') ||
      lines[i-1].includes('const topPerformingChapters') ||
      lines[i-1].includes('const chapterGrowthScoreData') ||
      lines[i-1].includes('const memberGrowthScoreData')
    )
  ) {
    // Actually, maybe we can just globally replace activeDateRange with effectiveDateRange where appropriate, but wait, there are places where we check if activeDateRange is null (like UI rendering).
  }
}
