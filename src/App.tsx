import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Referrals } from './pages/Referrals';
import { ThankYouSlips } from './pages/ThankYouSlips';
import { Settings } from './pages/Settings';
import { Categories } from './pages/Categories';
import { Chapters } from './pages/Chapters';
import { Members } from './pages/Members';
import { Meetings } from './pages/Meetings';
import { Guests } from './pages/Guests';

// Placeholder pages for now
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    <p className="text-slate-500 mt-2">This module is coming soon.</p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chapters" element={<ProtectedRoute allowedRoles={['admin']}><Chapters /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute allowedRoles={['admin', 'chapter_admin']}><Members /></ProtectedRoute>} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/thank-you-slips" element={<ThankYouSlips />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/categories" element={<ProtectedRoute allowedRoles={['admin']}><Categories /></ProtectedRoute>} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
