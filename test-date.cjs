const { subMonths } = require('date-fns');
try {
  subMonths(new Date('invalid'), 1);
  console.log("No error");
} catch(e) {
  console.log("Error:", e.message);
}
