# SSK Business Network — Complete Route Inventory

This inventory documents all public and authenticated routes discovered in the application routing hierarchy (`src/App.tsx`).

---

## 1. Public Routes (Accessible without Authentication)

| Route Path | Page / Component | Access Level | Description |
|---|---|---|---|
| `/` | `LandingPage` | Public | Main landing page & public portal |
| `/login` | `Login` | Public | Member & Admin authentication portal |
| `/register` | `Register` | Public | New member onboarding & registration |
| `/subscription-expired` | `SubscriptionExpired` | Public | Subscription status expired notice |

---

## 2. Protected Routes — Chapter Admin & General Member Roles

These routes are tested using the authenticated session (e.g. Chapter Admin test credentials):

| Route Path | Page / Component | Required Role(s) | Module / Dashboard |
|---|---|---|---|
| `/chapter-admin/home` | `Analytics` | `CHAPTER_ADMIN`, `MASTER_ADMIN` | Primary Chapter Admin Dashboard |
| `/member/home` | `Analytics` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Member Personal Dashboard |
| `/analytics` | `Analytics` | Authenticated (All) | Analytics Overview & KPI Cards |
| `/admin/analytics` | `Analytics` | `CHAPTER_ADMIN`, `MASTER_ADMIN` | Chapter Level Analytics |
| `/member/my-report` | `MyReport` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Individual Member Report & Contribution |
| `/meetings` | `Meetings` | Authenticated (All) | Meeting Scheduler, Attendance & Fees |
| `/wallet` | `Wallet` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Chapter Digital Wallet & Transactions |
| `/activity` | `Activity` | Authenticated (All) | Referral Notepads, Slips & Activities |
| `/refer` | `Activity` | Authenticated (All) | Referrals Creation & Log |
| `/thank-you-slips` | `Activity` | Authenticated (All) | Thank You Slips Exchange |
| `/testimonials` | `Testimonials` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Member Testimonials & Endorsements |
| `/reports` | `Reports` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Performance, Chapter & Attendance Reports |
| `/one-to-one` | `OneToOneMeetings` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | 1-to-1 Business Networking Scheduler |
| `/guests` | `Guests` | Authenticated (All) | Guest & Visitor Invitations Hub |
| `/directory` | `Connections` | Authenticated (All) | Member Directory & Contact Cards |
| `/member-tys` | `MemberTYS` | `CHAPTER_ADMIN`, `MASTER_ADMIN` | Chapter Thank You Slips Management |
| `/future-presentation` | `FuturePresentations` | `CHAPTER_ADMIN`, `MASTER_ADMIN` | Member Presentation Schedule |
| `/notifications` | `Notifications` | Authenticated (All) | Push Notifications & Activity Alerts |
| `/profile` | `Profile` | Authenticated (All) | Member Profile & Business Details |
| `/set-password` | `SetPassword` | `MEMBER`, `CHAPTER_ADMIN`, `MASTER_ADMIN` | Security Key / Password Management |

---

## 3. Protected Routes — Master Admin Role

| Route Path | Page / Component | Required Role(s) | Module / Dashboard |
|---|---|---|---|
| `/admin/home` | `Analytics` | `MASTER_ADMIN` | Master Admin Global Portal |
| `/admins` | `Admins` | `MASTER_ADMIN` | Chapter Admins Account Provisioning |
| `/members` | `Members` | `MASTER_ADMIN` | All Network Members Directory & Status |
| `/positions` | `Positions` | `MASTER_ADMIN` | Chapter Hierarchy & Positions Config |
| `/manage-chapter` | `ManageChapter` | `MASTER_ADMIN` | Chapters Creation & Setup |
| `/onboard` | `OnboardMember` | `MASTER_ADMIN` | Direct Member Onboarding |
| `/categories` | `Categories` | `MASTER_ADMIN` | Business Categories & Slot Allocation |
| `/subscriptions` | `ManageSubscriptions` | `MASTER_ADMIN` | Global Subscriptions & Renewals |
| `/settings` | `Settings` | `MASTER_ADMIN` | System Settings & Master Controls |
| `/testimonial-reports` | `TestimonialReports` | `MASTER_ADMIN` | Network Testimonials Audit |
