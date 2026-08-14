try {
  const formatter = new Intl.DateTimeFormat('en-US');
  formatter.formatToParts("2026-08-14 10:00:00");
  console.log("No error");
} catch(e) {
  console.log("Error:", e.name, e.message);
}
