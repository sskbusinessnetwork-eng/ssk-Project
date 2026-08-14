try {
  const sDate = new Date("invalid");
  sDate.setFullYear(sDate.getFullYear() + 1);
  sDate.toISOString();
} catch (e) {
  console.log("Error:", e.name, e.message);
}
