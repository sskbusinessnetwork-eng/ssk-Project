const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const t1 = `  const businessSentTotal = useMemo(() => {
    return businessSentSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.transactionValue) || 0), 0);
  }, [businessSentSlips]);`;

const r1 = `  const businessSentTotal = useMemo(() => {
    return businessSentSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.business_value || s.transactionValue) || 0), 0);
  }, [businessSentSlips]);`;

const t2 = `  const businessReceivedTotal = useMemo(() => {
    return businessReceivedSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.transactionValue) || 0), 0);
  }, [businessReceivedSlips]);`;

const r2 = `  const businessReceivedTotal = useMemo(() => {
    return businessReceivedSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.business_value || s.transactionValue) || 0), 0);
  }, [businessReceivedSlips]);`;

if(code.includes(t1) && code.includes(t2)) {
  code = code.replace(t1, r1);
  code = code.replace(t2, r2);
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log('Dashboard fixed');
}

let reportCode = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');
const reportT1 = `return acc + (Number(s.businessValue || s.amount) || 0);`;
const reportR1 = `return acc + (Number(s.businessValue || s.business_value || s.amount) || 0);`;
if(reportCode.includes(reportT1)) {
  reportCode = reportCode.split(reportT1).join(reportR1);
  fs.writeFileSync('src/pages/MyReport.tsx', reportCode);
  console.log('MyReport fixed');
}

let mcvCode = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf-8');
const mcvT1 = `const val = Number(s.businessValue || s.transactionValue) || 0;`;
const mcvR1 = `const val = Number(s.businessValue || s.business_value || s.transactionValue) || 0;`;
if(mcvCode.includes(mcvT1)) {
  mcvCode = mcvCode.replace(mcvT1, mcvR1);
  fs.writeFileSync('src/components/MemberCompanionView.tsx', mcvCode);
  console.log('MemberCompanionView fixed');
}
