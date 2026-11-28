import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalToast } from './components/GlobalToast';
import { showError } from './services/toastService';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { routeLoaders } from './routes/routeLoaders';

// Route-based code splitting for optimal bundle size and Lighthouse performance
const LandingPage = lazy(routeLoaders.landing);
const Register = lazy(routeLoaders.register);
const Login = lazy(routeLoaders.login);
const Analytics = lazy(routeLoaders.analytics);
const MyReport = lazy(routeLoaders.myReport);
const Activity = lazy(routeLoaders.activity);
const Testimonials = lazy(routeLoaders.testimonials);
const TestimonialReports = lazy(routeLoaders.testimonialReports);
const Positions = lazy(routeLoaders.positions);
const ManageChapter = lazy(routeLoaders.manageChapter);
const OnboardMember = lazy(routeLoaders.onboardMember);
const SetPassword = lazy(routeLoaders.setPassword);
const Profile = lazy(routeLoaders.profile);
const Categories = lazy(routeLoaders.categories);
const Admins = lazy(routeLoaders.admins);
const Members = lazy(routeLoaders.members);
const Meetings = lazy(routeLoaders.meetings);
const Guests = lazy(routeLoaders.guests);
const OneToOneMeetings = lazy(routeLoaders.oneToOneMeetings);
const Connections = lazy(routeLoaders.connections);
const Notifications = lazy(routeLoaders.notifications);
const SubscriptionExpired = lazy(routeLoaders.subscriptionExpired);
const Reports = lazy(routeLoaders.reports);
const ManageSubscriptions = lazy(routeLoaders.manageSubscriptions);
const Settings = lazy(routeLoaders.settings);
const MemberTYS = lazy(routeLoaders.memberTYS);
const FuturePresentations = lazy(routeLoaders.futurePresentations);
const Wallet = lazy(routeLoaders.wallet);

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Global uncaught error and rejection listeners
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent browser default logging if already handled or empty
      if (!event.reason) {
        event.preventDefault?.();
        return;
      }
      
      const reasonMsg = event.reason?.message || event.reason?.error || (typeof event.reason === 'string' ? event.reason : '');
      const isIgnorable = !reasonMsg || 
        reasonMsg.includes('ResizeObserver') || 
        reasonMsg.includes('canceled') || 
        reasonMsg.includes('aborted') || 
        reasonMsg.includes('AbortError');

      if (!isIgnorable) {
        console.warn('Handled rejection:', event.reason);
        showError(reasonMsg);
      }
      event.preventDefault?.();
    };

    const handleGlobalError = (event: ErrorEvent) => {
      if (!event.error && !event.message) {
        event.preventDefault?.();
        return;
      }
      const msg = event.message || event.error?.message || '';
      const isIgnorable = !msg || 
        msg.includes('ResizeObserver') || 
        msg.includes('Script error') || 
        msg.includes('canceled');

      if (!isIgnorable) {
        console.warn('Handled global error:', event.error || msg);
        showError(msg);
      }
      event.preventDefault?.();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <GlobalToast />
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/subscription-expired" element={<SubscriptionExpired />} />
                
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/admin/home" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Analytics /></ProtectedRoute>} />
                  <Route path="/chapter-admin/home" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN']}><Analytics /></ProtectedRoute>} />
                  <Route path="/member/home" element={<ProtectedRoute allowedRoles={['MEMBER', 'CHAPTER_ADMIN', 'MASTER_ADMIN']}><Analytics /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
                  <Route path="/master-admin/dashboard" element={<Navigate to="/admin/home" replace />} />
                  <Route path="/member/my-report" element={<ProtectedRoute allowedRoles={['MEMBER', 'MASTER_ADMIN', 'CHAPTER_ADMIN']}><MyReport /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN']}><Analytics /></ProtectedRoute>} />
                  <Route path="/admins" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Admins /></ProtectedRoute>} />
                  <Route path="/members" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Members /></ProtectedRoute>} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/wallet" element={<ProtectedRoute allowedRoles={['MEMBER', 'CHAPTER_ADMIN', 'MASTER_ADMIN']}><Wallet /></ProtectedRoute>} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/refer" element={<Activity />} />
                  <Route path="/referrals" element={<Activity />} />
                  <Route path="/thank-you-slips" element={<Activity />} />
                  <Route path="/testimonials" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER']}><Testimonials /></ProtectedRoute>} />
                  <Route path="/testimonial-reports" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><TestimonialReports /></ProtectedRoute>} />
                  <Route path="/positions" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Positions /></ProtectedRoute>} />
                  <Route path="/manage-chapter" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><ManageChapter /></ProtectedRoute>} />
                  <Route path="/member-tys" element={<ProtectedRoute allowedRoles={['CHAPTER_ADMIN', 'MASTER_ADMIN']}><MemberTYS /></ProtectedRoute>} />
                  <Route path="/future-presentation" element={<ProtectedRoute allowedRoles={['CHAPTER_ADMIN', 'MASTER_ADMIN']}><FuturePresentations /></ProtectedRoute>} />
                  <Route path="/add-member" element={<ProtectedRoute allowedRoles={['CHAPTER_ADMIN']}><Members /></ProtectedRoute>} />
                  <Route path="/onboard" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><OnboardMember /></ProtectedRoute>} />
                  <Route path="/set-password" element={<ProtectedRoute allowedRoles={['MEMBER', 'CHAPTER_ADMIN', 'MASTER_ADMIN']}><SetPassword /></ProtectedRoute>} />
                  <Route path="/guests" element={<Guests />} />
                  <Route path="/one-to-one" element={<ProtectedRoute allowedRoles={['MEMBER', 'MASTER_ADMIN', 'CHAPTER_ADMIN']}><OneToOneMeetings /></ProtectedRoute>} />
                  <Route path="/directory" element={<Connections />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/categories" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Categories /></ProtectedRoute>} />
                  <Route path="/subscriptions" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><ManageSubscriptions /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER']}><Reports /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Settings /></ProtectedRoute>} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
