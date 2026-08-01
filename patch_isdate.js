const fs = require('fs');
const file = 'src/utils/growthScore.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `    const isDateInRange = (dateInput: any) => {
      if (!dateInput) return false;
      try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return false;
        return d.getTime() >= dStart.getTime() && d.getTime() <= dEnd.getTime();
      } catch {
        return false;
      }
    };`;

const replacement = `    const isDateInRange = (dateInput: any) => {
      if (!dateInput) return false;
      try {
        let d = new Date(dateInput);
        if (typeof dateInput === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(dateInput)) {
          const [year, month, day] = dateInput.split('-').map(Number);
          d = new Date(year, month - 1, day);
        }
        if (isNaN(d.getTime())) return false;
        
        // Match day exactly by formatting both to local YYYY-MM-DD to avoid time/timezone issues
        const dLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const currentLocal = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        if (dLocal === currentLocal) return true;

        return d.getTime() >= dStart.getTime() && d.getTime() <= dEnd.getTime();
      } catch {
        return false;
      }
    };`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
