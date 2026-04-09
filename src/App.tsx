import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Analytics } from './pages/Dashboard';
import { Referrals } from './pages/Referrals';
import { ThankYouSlips } from './pages/ThankYouSlips';
import { Profile } from './pages/Profile';
import { Categories } from './pages/Categories';
import { Admins } from './pages/Admins';
import { Members } from './pages/Members';
import { Meetings } from './pages/Meetings';
import { Guests } from './pages/Guests';
import { OneToOneMeetings } from './pages/OneToOneMeetings';
import { Connections } from './pages/Connections';
import { Notifications } from './pages/Notifications';
import { SubscriptionExpired } from './pages/SubscriptionExpired';
import { checkDatabaseConnection } from './firebase';

import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/subscription-expired" element={<SubscriptionExpired />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN']}><Analytics /></ProtectedRoute>} />
              <Route path="/admins" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Admins /></ProtectedRoute>} />
              <Route path="/members" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN']}><Members /></ProtectedRoute>} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/refer" element={<Referrals />} />
              <Route path="/thank-you-slips" element={<ThankYouSlips />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/one-to-one" element={<ProtectedRoute allowedRoles={['MEMBER', 'MASTER_ADMIN', 'CHAPTER_ADMIN']}><OneToOneMeetings /></ProtectedRoute>} />
              <Route path="/network" element={<Connections />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/categories" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><Categories /></ProtectedRoute>} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
