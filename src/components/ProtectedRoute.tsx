import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { getDashboardPath } from '../utils/authUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const savedUser = localStorage.getItem('user');

  // 1. If we are still determining auth state OR we have a user but no profile yet, show loading
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.3em] animate-pulse">
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
  
  if (profile?.must_change_password && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />;
  }

  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    const dashboardPath = getDashboardPath(profile.role);
    return <Navigate to={dashboardPath} replace />;
  }

  // Check subscription for members and chapter admins
  if (profile && (profile.role === 'MEMBER' || profile.role === 'CHAPTER_ADMIN')) {
    const endDate = profile.subscriptionEndDate || profile.subscriptionEnd;
    if (endDate) {
      const expiryDate = new Date(endDate);
      const now = new Date();
      if (now > expiryDate) {
        return <Navigate to="/subscription-expired" replace />;
      }
    }
  }

  return <>{children}</>;
}
