import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { getDashboardPath } from '../utils/authUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const savedUser = localStorage.getItem('user');

  // 1. If we are still determining auth state OR we have a user but no profile yet, show loading
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
            Loading Profile...
          </p>
        </div>
      </div>
    );
  }

  // 2. If Firebase says no user AND we don't have a saved user in localStorage, redirect to login
  if (!user && !savedUser) {
    return <Navigate to="/login" replace />;
  }

  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    const dashboardPath = getDashboardPath(profile.role);
    return <Navigate to={dashboardPath} replace />;
  }

  // Check subscription for members
  if (profile && profile.role === 'MEMBER' && profile.subscriptionEnd) {
    const expiryDate = new Date(profile.subscriptionEnd);
    const now = new Date();
    if (now > expiryDate) {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

  return <>{children}</>;
}
