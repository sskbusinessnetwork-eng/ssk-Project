import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { getDashboardPath } from '../utils/authUtils';
import { BrandLogo } from './BrandLogo';
import { getSubscriptionStatus } from '../utils/memberStatus';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F17] text-white p-6 space-y-4">
        <div className="relative">
          <div className="absolute -inset-4 rounded-[32px] bg-primary/20 blur-xl animate-pulse" />
          <BrandLogo size="lg" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-neutral-400 pt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
          <span>Loading Profile...</span>
        </div>
      </div>
    );
  }

  // 2. If Firebase says no user AND we don't have a saved user in localStorage, redirect to login
  if (!user && !savedUser) {
    return <Navigate to="/login" replace />;
  }
  
  const needsPasswordChange = 
    profile?.must_change_password === true || 
    profile?.mustChangePassword === true || 
    profile?.password_changed === false || 
    profile?.passwordChanged === false;

  if (needsPasswordChange && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />;
  }

  if (profile && allowedRoles) {
    const isChapterAdmin = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');
    
    const hasRole = allowedRoles.includes(profile.role) || 
      (allowedRoles.includes('CHAPTER_ADMIN') && isChapterAdmin) ||
      (allowedRoles.includes('MEMBER') && profile.role === 'MEMBER');

    if (!hasRole) {
      const dashboardPath = getDashboardPath(profile.role, profile.position);
      return <Navigate to={dashboardPath} replace />;
    }
  }

  // Check subscription for members and chapter admins
  if (profile && (profile.role === 'MEMBER' || profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin'))) {
    const subStatus = getSubscriptionStatus(profile);
    if (subStatus === 'Inactive / Expired') {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

  return <>{children}</>;
}
