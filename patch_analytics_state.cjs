const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStateLine = '  const [isFilterLoading, setIsFilterLoading] = useState(false);';
const replacementStateLine = '  const [isFilterLoading, setIsFilterLoading] = useState(false);\n  const [analyticsLoading, setAnalyticsLoading] = useState(false);\n  const [analyticsError, setAnalyticsError] = useState(false);';

if (code.includes(targetStateLine)) {
  code = code.replace(targetStateLine, replacementStateLine);
}

const targetOpenAnalytics = 'setAnalyticsModalCategory(title);';
const replacementOpenAnalytics = `setAnalyticsModalCategory(title);
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    setTimeout(() => {
      // 5% chance to show error to demonstrate error state if you want, but better to just succeed
      setAnalyticsLoading(false);
    }, 600);`;

// Let's find where setAnalyticsModalCategory is called
if (code.includes(targetOpenAnalytics)) {
  code = code.replace(new RegExp('setAnalyticsModalCategory\\(title\\);', 'g'), replacementOpenAnalytics);
}

fs.writeFileSync(file, code);
console.log('Patched state successfully');
