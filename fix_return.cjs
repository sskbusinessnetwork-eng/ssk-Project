const fs = require('fs');
const file = 'src/components/MemberCompanionView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
"      latestRevenue: revenueVals[revenueVals.length - 1] || 0\n    };\n  }, [allSlips, allReferrals]);",
"      latestRevenue: revenueVals[revenueVals.length - 1] || 0,\n      userBusinessStats\n    };\n  }, [allSlips, allReferrals, profile]);"
);

fs.writeFileSync(file, content);
