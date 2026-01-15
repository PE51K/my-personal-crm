/**
 * Authentication hooks and context
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bootstrap,
  getBootstrapStatus,
  getCurrentUser,
  login,
  logout,
} from '@/services/auth';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/services/api';
import type { AuthCredentials, User } from '@/types';

/**
 * Auth context state
 */
interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean | null;
  checkingInitialization: boolean;
  checkingAuth: boolean; // True when we have a token but user is still loading
  login: (credentials: AuthCredentials) => Promise<void>;
  bootstrap: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextState | null>(null);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // Query for bootstrap status
  const {
    data: bootstrapStatus,
    isLoading: checkingInitialization,
    refetch: refetchBootstrapStatus,
  } = useQuery({
    queryKey: ['bootstrap-status'],
    queryFn: getBootstrapStatus,
    staleTime: Infinity, // Only fetch once unless manually invalidated
    retry: false,
  });

  // Update isInitialized when bootstrap status changes
  useEffect(() => {
    if (bootstrapStatus !== undefined) {
      setIsInitialized(bootstrapStatus.initialized);
    }
  }, [bootstrapStatus]);

  // Query for current user (only if we have a token)
  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    enabled: !!getAccessToken() && isInitialized === true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      void queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  // Bootstrap mutation
  const bootstrapMutation = useMutation({
    mutationFn: bootstrap,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      setIsInitialized(true);
      void queryClient.invalidateQueries({ queryKey: ['bootstrap-status'] });
      void queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await logout({ refresh_token: refreshToken });
      }
    },
    onSettled: () => {
      clearTokens();
      queryClient.clear();
    },
  });

  // Handle login
  const handleLogin = useCallback(
    async (credentials: AuthCredentials): Promise<void> => {
      await loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  // Handle bootstrap
  const handleBootstrap = useCallback(
    async (credentials: AuthCredentials): Promise<void> => {
      await bootstrapMutation.mutateAsync(credentials);
    },
    [bootstrapMutation]
  );

  // Handle logout
  const handleLogout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Handle refetch user
  const handleRefetchUser = useCallback(async (): Promise<void> => {
    await refetchUser();
  }, [refetchUser]);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = (): void => {
      queryClient.clear();
      void refetchBootstrapStatus();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [queryClient, refetchBootstrapStatus]);

  // Check if we have a token but user is still loading (avoid login flash)
  const hasToken = !!getAccessToken();
  const checkingAuth = hasToken && isInitialized === true && isLoadingUser;

  const value: AuthContextState = {
    user: user ?? null,
    isAuthenticated: !!user && hasToken,
    isLoading:
      isLoadingUser ||
      loginMutation.isPending ||
      bootstrapMutation.isPending ||
      logoutMutation.isPending,
    isInitialized,
    checkingInitialization,
    checkingAuth,
    login: handleLogin,
    bootstrap: handleBootstrap,
    logout: handleLogout,
    refetchUser: handleRefetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
