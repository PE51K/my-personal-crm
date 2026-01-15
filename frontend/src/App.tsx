/**
 * Main application component with routing
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Spinner } from '@/components/ui/Spinner';
import { SetupPage } from '@/pages/SetupPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AddContactPage } from '@/pages/AddContactPage';
import { KanbanPage } from '@/pages/KanbanPage';
import { GraphPage } from '@/pages/GraphPage';

/**
 * Loading screen component
 */
function LoadingScreen(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Main App component
 */
export default function App(): React.JSX.Element {
  const { checkingInitialization, isInitialized, isAuthenticated } = useAuth();

  // Show loading screen while checking initialization status
  if (checkingInitialization || isInitialized === null) {
    return <LoadingScreen />;
  }

  // If not initialized, redirect to setup
  // If initialized but not authenticated, redirect to login
  // If authenticated, show protected routes
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        {!isInitialized ? (
          <>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : !isAuthenticated ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts/add"
              element={
                <ProtectedRoute>
                  <AddContactPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kanban"
              element={
                <ProtectedRoute>
                  <KanbanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/graph"
              element={
                <ProtectedRoute>
                  <GraphPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
