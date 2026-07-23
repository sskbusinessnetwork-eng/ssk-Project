const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const effect = `
  useEffect(() => {
    const handleRefresh = () => {
      // The auth context's profile might update via refreshProfile, 
      // but if we want to manually re-render we can add a state toggle.
      // For now we will rely on profile reference change if refreshProfile is called.
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);
`;

code = code.replace("  // Unified dynamic subscriptions", effect + "\n  // Unified dynamic subscriptions");
fs.writeFileSync('src/pages/Dashboard.tsx', code);
