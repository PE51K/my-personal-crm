/**
 * Bootstrap status response
 */
export interface BootstrapStatusResponse {
  initialized: boolean;
}

/**
 * Bootstrap/Login request
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Logout request
 */
export interface LogoutRequest {
  refresh_token: string;
}

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  created_at?: string;
}

/**
 * Authentication token response
 */
export interface AuthTokenResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  message: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
