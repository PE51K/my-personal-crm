/**
 * Protected route wrapper component
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/Spinner';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactNode {
  const { isAuthenticated, isLoading, isInitialized, checkingInitialization } = useAuth();
  const location = useLocation();

  // Show loading while checking initialization or authentication
  if (checkingInitialization || isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If not initialized, redirect to setup
  if (isInitialized === false) {
    return <Navigate to="/setup" replace />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
