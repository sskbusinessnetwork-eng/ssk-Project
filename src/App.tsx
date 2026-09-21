import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { GlobalToast } from './components/GlobalToast';
import { showError } from './services/toastService';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy-load non-landing routes to drastically reduce initial JS payload and execution time
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Analytics = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Analytics })));
const MyReport = lazy(() => import('./pages/MyReport').then(m => ({ default: m.MyReport })));
const Activity = lazy(() => import('./pages/Activity').then(m => ({ default: m.Activity })));
const Testimonials = lazy(() => import('./pages/Testimonials').then(m => ({ default: m.Testimonials })));
const TestimonialReports = lazy(() => import('./pages/TestimonialReports').then(m => ({ default: m.TestimonialReports })));
const Positions = lazy(() => import('./pages/Positions').then(m => ({ default: m.Positions })));
const ManageChapter = lazy(() => import('./pages/ManageChapter').then(m => ({ default: m.ManageChapter })));
const OnboardMember = lazy(() => import('./pages/OnboardMember').then(m => ({ default: m.OnboardMember })));
const SetPassword = lazy(() => import('./pages/SetPassword').then(m => ({ default: m.SetPassword })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Categories = lazy(() => import('./pages/Categories').then(m => ({ default: m.Categories })));
const Admins = lazy(() => import('./pages/Admins').then(m => ({ default: m.Admins })));
const Members = lazy(() => import('./pages/Members').then(m => ({ default: m.Members })));
const Meetings = lazy(() => import('./pages/Meetings').then(m => ({ default: m.Meetings })));
const Guests = lazy(() => import('./pages/Guests').then(m => ({ default: m.Guests })));
const OneToOneMeetings = lazy(() => import('./pages/OneToOneMeetings').then(m => ({ default: m.OneToOneMeetings })));
const Connections = lazy(() => import('./pages/Connections').then(m => ({ default: m.Connections })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired').then(m => ({ default: m.SubscriptionExpired })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ManageSubscriptions = lazy(() => import('./pages/ManageSubscriptions').then(m => ({ default: m.ManageSubscriptions })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const MemberTYS = lazy(() => import('./pages/MemberTYS').then(m => ({ default: m.MemberTYS })));

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
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/refer" element={<Activity />} />
                  <Route path="/referrals" element={<Activity />} />
                  <Route path="/thank-you-slips" element={<Activity />} />
                  <Route path="/testimonials" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER']}><Testimonials /></ProtectedRoute>} />
                  <Route path="/testimonial-reports" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><TestimonialReports /></ProtectedRoute>} />
                  <Route path="/positions" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Positions /></ProtectedRoute>} />
                  <Route path="/manage-chapter" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><ManageChapter /></ProtectedRoute>} />
                  <Route path="/member-tys" element={<ProtectedRoute allowedRoles={['CHAPTER_ADMIN', 'MASTER_ADMIN']}><MemberTYS /></ProtectedRoute>} />
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
