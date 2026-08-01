const fs = require('fs');
const file = 'src/pages/MyReport.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  });`,
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const effectiveDateRange = React.useMemo(() => {
    if (activeDateRange) return activeDateRange;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  }, [activeDateRange]);`
);

content = content.replace(
  `  const handleClearFilter = () => {
    setFilterStartDate(new Date().toISOString().split('T')[0]);
    setFilterEndDate(new Date().toISOString().split('T')[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setActiveDateRange({ start: today, end: end });
    setIsFilterModalOpen(false);
  };`,
  `  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveDateRange(null);
    setIsFilterModalOpen(false);
  };`
);

// We have this code block in MyReport.tsx for the calculateChapterGrowthScoreData call:
content = content.replace(
  `calculateChapterGrowthScoreData({
      chapterMembers: chapterUsers,
      activeDateRange: activeDateRange,`,
  `calculateChapterGrowthScoreData({
      chapterMembers: chapterUsers,
      activeDateRange: effectiveDateRange,`
);

content = content.replace(
  `calculateMemberGrowthScoreData({
      currentProfile: profile,
      activeDateRange: activeDateRange,`,
  `calculateMemberGrowthScoreData({
      currentProfile: profile,
      activeDateRange: effectiveDateRange,`
);

// Replace activeDateRange with effectiveDateRange in filtering logic
const lines = content.split('\n');
for (let i = 135; i < 185; i++) {
  if (lines[i] && lines[i].includes('activeDateRange')) {
    lines[i] = lines[i].replace(/activeDateRange/g, 'effectiveDateRange');
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log("MyReport patched.");
