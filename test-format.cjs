const { format } = require('date-fns');
try {
  format(new Date('invalid'), 'MMM yyyy');
  console.log("No error");
} catch(e) {
  console.log("Error:", e.message);
}
