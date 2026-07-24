function getSubscriptionDates(u) {
  if (!u) return { startDate: null, endDate: null, startDateStr: '', endDateStr: '' };

  const startVal = u.subscription_start_date || u.subscriptionStartDate || u.subscription_start || u.subscriptionStart;
  const endVal = u.subscription_end_date || u.subscriptionEndDate || u.subscription_end || u.subscriptionEnd;

  let startDate = null;
  let endDate = null;
  let startDateStr = '';
  let endDateStr = '';

  if (startVal) {
    const s = new Date(startVal);
    if (!isNaN(s.getTime())) {
      startDate = s;
      startDateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
    }
  }

  if (endVal) {
    const e = new Date(endVal);
    if (!isNaN(e.getTime())) {
      endDate = e;
      endDateStr = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
    }
  }

  return { startDate, endDate, startDateStr, endDateStr };
}

function getSubscriptionStatus(u) {
  if (!u) return 'Inactive / Expired';
  if (u.role === 'MASTER_ADMIN') return 'Active';

  const { startDateStr, endDateStr } = getSubscriptionDates(u);

  // If no dates are present at all
  if (!endDateStr && !startDateStr) {
    const rawStatus = (u.subscription_status || u.subscriptionStatus || '').trim().toLowerCase();
    if (rawStatus === 'active') return 'Active';
    return 'Inactive / Expired';
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  console.log({ todayStr, startDateStr, endDateStr });

  // If today's date is after Subscription End Date -> Expired
  if (endDateStr && todayStr > endDateStr) {
    return 'Inactive / Expired';
  }

  // If subscription has not yet started -> Pending
  if (startDateStr && todayStr < startDateStr) {
    return 'Pending';
  }

  // Today's date is between Start Date and End Date (inclusive) -> Active
  return 'Active';
}

const user = {
    role: "MEMBER",
    subscriptionStart: "2026-07-23", // maybe ISO string?
    subscriptionEnd: "2027-07-23"
};
console.log(getSubscriptionStatus(user));

const userISO = {
    role: "MEMBER",
    subscriptionStart: "2026-07-23T00:00:00.000Z",
    subscriptionEnd: "2027-07-23T00:00:00.000Z"
};
console.log(getSubscriptionStatus(userISO));
