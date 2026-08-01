const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const userCandidateIdsStr = `  const userCandidateIds = useMemo(() => {
    return [profile?.id, profile?.uid].filter(Boolean).map(String);
  }, [profile]);`;

code = code.replace(userCandidateIdsStr, '');

code = code.replace(/const chapterSlips = useMemo/, userCandidateIdsStr + '\n\n  const chapterSlips = useMemo');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
