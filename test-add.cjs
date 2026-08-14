const { addYears, addDays, startOfWeek } = require('date-fns');
try {
  addYears(new Date('invalid'), 1);
  console.log("No error");
} catch(e) {
  console.log("Error:", e.message);
}
