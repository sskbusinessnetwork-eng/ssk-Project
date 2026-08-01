const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const [filterStartDate, setFilterStartDate] = useState<string>('');`,
  `const [filterStartDate, setFilterStartDate] = useState<string>('');` // It is currently empty string
);
content = content.replace(
  `const [filterEndDate, setFilterEndDate] = useState<string>('');`,
  `const [filterEndDate, setFilterEndDate] = useState<string>('');` // currently empty string
);

// activeDateRange is currently null
content = content.replace(
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);`,
  `const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hasInitializedDate, setHasInitializedDate] = useState(false);

  useEffect(() => {
    if (profile && !hasInitializedDate) {
      if (profile.role === 'MASTER_ADMIN') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        setActiveDateRange({ start: today, end: end });
        setFilterStartDate(today.toISOString().split('T')[0]);
        setFilterEndDate(today.toISOString().split('T')[0]);
      } else {
        setActiveDateRange(null);
        setFilterStartDate('');
        setFilterEndDate('');
      }
      setHasInitializedDate(true);
    }
  }, [profile, hasInitializedDate]);`
);

content = content.replace(
  `  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedChapterFilter('ALL');
    setSelectedMemberFilter('ALL');
    setAppliedChapterFilter('ALL');
    setAppliedMemberFilter('ALL');
    setDateError(null);
    setActiveDateRange(null);
  };`,
  `  const handleClearFilter = () => {
    if (profile?.role === 'MASTER_ADMIN') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setActiveDateRange({ start: today, end: end });
      setFilterStartDate(today.toISOString().split('T')[0]);
      setFilterEndDate(today.toISOString().split('T')[0]);
    } else {
      setActiveDateRange(null);
      setFilterStartDate('');
      setFilterEndDate('');
    }
    setSelectedChapterFilter('ALL');
    setSelectedMemberFilter('ALL');
    setAppliedChapterFilter('ALL');
    setAppliedMemberFilter('ALL');
    setDateError(null);
  };`
);

fs.writeFileSync(file, content);
console.log("Dashboard logic patched.");
