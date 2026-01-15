/**
 * Authentication API service
 */

import { api } from './api';
import type {
  AuthCredentials,
  AuthTokenResponse,
  BootstrapStatusResponse,
  LogoutRequest,
  LogoutResponse,
  User,
} from '@/types';

/**
 * Check if the application has been initialized
 */
export async function getBootstrapStatus(): Promise<BootstrapStatusResponse> {
  return api.get<BootstrapStatusResponse>('/auth/bootstrap/status', { skipAuth: true });
}

/**
 * Create the owner account (first-time setup)
 */
export async function bootstrap(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  return api.post<AuthTokenResponse>('/auth/bootstrap', credentials, { skipAuth: true });
}

/**
 * Login with email and password
 */
export async function login(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  return api.post<AuthTokenResponse>('/auth/login', credentials, { skipAuth: true });
}

/**
 * Logout and invalidate refresh token
 */
export async function logout(request: LogoutRequest): Promise<LogoutResponse> {
  return api.post<LogoutResponse>('/auth/logout', request);
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me');
}
