const { differenceInDays } = require('date-fns');
try {
  differenceInDays(new Date('invalid'), new Date());
  console.log("No error");
} catch(e) {
  console.log("Error:", e.message);
}
