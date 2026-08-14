const isDateInRange = (dateInput, currentIST) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return false;
    return d.toISOString().split('T')[0] === currentIST;
};

// Mock data
const currentIST = "2026-08-10";
const ref = { id: 1, status: 'CONVERTED', created_at: "2026-08-09T10:00:00Z", updated_at: "2026-08-10T10:00:00Z" };
const slip = null; // not sent yet

const createdOnThisDay = isDateInRange(ref.created_at, currentIST);
const convertedOnThisDay = ref.status === 'CONVERTED' && isDateInRange(ref.updated_at, currentIST);

if (createdOnThisDay && !convertedOnThisDay) {
    console.log("Update Referral: Incomplete");
} else if (convertedOnThisDay) {
    console.log("Update Referral: Completed");
    
    // Slip logic
    const sentSlipToday = slip && isDateInRange(slip.created_at, currentIST);
    console.log("Send Slip: " + (sentSlipToday ? "Completed" : "Incomplete"));
}
