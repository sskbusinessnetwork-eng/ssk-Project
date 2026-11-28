import type { ComponentType } from 'react';

type ModuleLoader<T extends ComponentType<any> = ComponentType<any>> = () => Promise<{ default: T }>;

function createCachedLoader<T extends ComponentType<any>>(loader: ModuleLoader<T>): ModuleLoader<T> {
  let cachedPromise: Promise<{ default: T }> | null = null;
  return () => {
    if (!cachedPromise) {
      cachedPromise = loader().catch((err) => {
        cachedPromise = null;
        throw err;
      });
    }
    return cachedPromise;
  };
}

export const routeLoaders = {
  landing: createCachedLoader(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage }))),
  register: createCachedLoader(() => import('../pages/Register').then(m => ({ default: m.Register }))),
  login: createCachedLoader(() => import('../pages/Login').then(m => ({ default: m.Login }))),
  analytics: createCachedLoader(() => import('../pages/Dashboard').then(m => ({ default: m.Analytics }))),
  myReport: createCachedLoader(() => import('../pages/MyReport').then(m => ({ default: m.MyReport }))),
  activity: createCachedLoader(() => import('../pages/Activity').then(m => ({ default: m.Activity }))),
  testimonials: createCachedLoader(() => import('../pages/Testimonials').then(m => ({ default: m.Testimonials }))),
  testimonialReports: createCachedLoader(() => import('../pages/TestimonialReports').then(m => ({ default: m.TestimonialReports }))),
  positions: createCachedLoader(() => import('../pages/Positions').then(m => ({ default: m.Positions }))),
  manageChapter: createCachedLoader(() => import('../pages/ManageChapter').then(m => ({ default: m.ManageChapter }))),
  onboardMember: createCachedLoader(() => import('../pages/OnboardMember').then(m => ({ default: m.OnboardMember }))),
  setPassword: createCachedLoader(() => import('../pages/SetPassword').then(m => ({ default: m.SetPassword }))),
  profile: createCachedLoader(() => import('../pages/Profile').then(m => ({ default: m.Profile }))),
  categories: createCachedLoader(() => import('../pages/Categories').then(m => ({ default: m.Categories }))),
  admins: createCachedLoader(() => import('../pages/Admins').then(m => ({ default: m.Admins }))),
  members: createCachedLoader(() => import('../pages/Members').then(m => ({ default: m.Members }))),
  meetings: createCachedLoader(() => import('../pages/Meetings').then(m => ({ default: m.Meetings }))),
  guests: createCachedLoader(() => import('../pages/Guests').then(m => ({ default: m.Guests }))),
  oneToOneMeetings: createCachedLoader(() => import('../pages/OneToOneMeetings').then(m => ({ default: m.OneToOneMeetings }))),
  connections: createCachedLoader(() => import('../pages/Connections').then(m => ({ default: m.Connections }))),
  notifications: createCachedLoader(() => import('../pages/Notifications').then(m => ({ default: m.Notifications }))),
  subscriptionExpired: createCachedLoader(() => import('../pages/SubscriptionExpired').then(m => ({ default: m.SubscriptionExpired }))),
  reports: createCachedLoader(() => import('../pages/Reports').then(m => ({ default: m.Reports }))),
  manageSubscriptions: createCachedLoader(() => import('../pages/ManageSubscriptions').then(m => ({ default: m.ManageSubscriptions }))),
  settings: createCachedLoader(() => import('../pages/Settings').then(m => ({ default: m.Settings }))),
  memberTYS: createCachedLoader(() => import('../pages/MemberTYS').then(m => ({ default: m.MemberTYS }))),
  futurePresentations: createCachedLoader(() => import('../pages/FuturePresentations').then(m => ({ default: m.FuturePresentations }))),
  wallet: createCachedLoader(() => import('../pages/Wallet').then(m => ({ default: m.Wallet }))),
};

const pathToLoader: Record<string, ModuleLoader> = {
  '/': routeLoaders.landing,
  '/register': routeLoaders.register,
  '/login': routeLoaders.login,
  '/subscription-expired': routeLoaders.subscriptionExpired,
  '/analytics': routeLoaders.analytics,
  '/dashboard': routeLoaders.analytics,
  '/admin/home': routeLoaders.analytics,
  '/chapter-admin/home': routeLoaders.analytics,
  '/member/home': routeLoaders.analytics,
  '/admin/analytics': routeLoaders.analytics,
  '/member/my-report': routeLoaders.myReport,
  '/admins': routeLoaders.admins,
  '/members': routeLoaders.members,
  '/add-member': routeLoaders.members,
  '/meetings': routeLoaders.meetings,
  '/wallet': routeLoaders.wallet,
  '/activity': routeLoaders.activity,
  '/refer': routeLoaders.activity,
  '/referrals': routeLoaders.activity,
  '/thank-you-slips': routeLoaders.activity,
  '/testimonials': routeLoaders.testimonials,
  '/testimonial-reports': routeLoaders.testimonialReports,
  '/positions': routeLoaders.positions,
  '/manage-chapter': routeLoaders.manageChapter,
  '/member-tys': routeLoaders.memberTYS,
  '/future-presentation': routeLoaders.futurePresentations,
  '/onboard': routeLoaders.onboardMember,
  '/set-password': routeLoaders.setPassword,
  '/guests': routeLoaders.guests,
  '/one-to-one': routeLoaders.oneToOneMeetings,
  '/directory': routeLoaders.connections,
  '/notifications': routeLoaders.notifications,
  '/categories': routeLoaders.categories,
  '/subscriptions': routeLoaders.manageSubscriptions,
  '/reports': routeLoaders.reports,
  '/settings': routeLoaders.settings,
  '/profile': routeLoaders.profile,
};

export function preloadRouteByPath(path?: string | null): void {
  if (!path) return;
  const cleanPath = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const loader = pathToLoader[cleanPath];
  if (loader) {
    loader().catch(() => {});
  }
}

export function preloadAuthenticatedRoutes(role?: string | null): void {
  const normalizedRole = String(role || '').toUpperCase();
  const loaders: ModuleLoader[] = [
    routeLoaders.activity,
    routeLoaders.analytics,
    routeLoaders.wallet,
    routeLoaders.connections,
    routeLoaders.meetings,
    routeLoaders.oneToOneMeetings,
    routeLoaders.guests,
    routeLoaders.notifications,
    routeLoaders.profile,
  ];

  if (normalizedRole === 'MASTER_ADMIN') {
    loaders.push(
      routeLoaders.reports,
      routeLoaders.manageChapter,
      routeLoaders.members,
      routeLoaders.categories,
      routeLoaders.manageSubscriptions,
      routeLoaders.testimonialReports,
      routeLoaders.settings,
      routeLoaders.memberTYS,
      routeLoaders.futurePresentations
    );
  } else {
    loaders.push(
      routeLoaders.myReport,
      routeLoaders.testimonials,
      routeLoaders.reports,
      routeLoaders.memberTYS,
      routeLoaders.futurePresentations
    );
  }

  loaders.forEach((loader) => {
    loader().catch(() => {});
  });
}
