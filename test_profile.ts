import { isMemberActive, getSubscriptionStatus, getSubscriptionDates } from './src/utils/memberStatus';

const profile = {
  account_status: 'Active',
  membership_status: 'Active',
  subscription_start: '24-07-2026',
  subscription_end: '24-07-2027',
  role: 'MEMBER'
};

console.log("isActive:", isMemberActive(profile));
console.log("status:", getSubscriptionStatus(profile));
console.log("dates:", getSubscriptionDates(profile));
