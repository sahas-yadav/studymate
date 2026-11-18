import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardSkeleton } from './LoadingSkeleton';

export function ProtectedRoute({
  children,
  requireOnboarding = true,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { isAuthenticated, userProfile, authReady, profileLoading } = useAuth();
  const location = useLocation();

  if (!authReady || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOnboarding && userProfile && !userProfile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
