/**
 * Typed API client with authentication handling
 */

import { env } from '@/config/env';
import type { ApiError, RefreshTokenResponse } from '@/types';

/**
 * Token storage keys
 */
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;

/**
 * Queue of requests waiting for token refresh
 */
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Add a callback to be called when token refresh completes
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all waiting requests that token has been refreshed
 */
function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((callback) => { callback(newToken); });
  refreshSubscribers = [];
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store tokens after login/bootstrap
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear tokens on logout
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${env.apiBaseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as RefreshTokenResponse;
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown> | undefined;

  constructor(error: ApiError['error'], status: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

/**
 * Request configuration options
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Build query string from params object
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | string[] | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      // Join arrays with commas as per API contract
      if (value.length > 0) {
        searchParams.set(key, value.join(','));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Execute the actual fetch request
 */
async function executeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown
): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  // Handle no content response
  if (response.status === 204) {
    return { response, data: undefined };
  }

  const data: unknown = await response.json();
  return { response, data };
}

/**
 * Make an API request with typed response and automatic token refresh
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const url = `${env.apiBaseUrl}/v1${endpoint}`;

  const buildHeaders = (token: string | null): Record<string, string> => {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (!skipAuth && token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    return requestHeaders;
  };

  const accessToken = getAccessToken();
  const requestHeaders = buildHeaders(accessToken);

  const { response, data } = await executeRequest(url, method, requestHeaders, body);

  // Handle 401 errors with token refresh
  if (response.status === 401 && !skipAuth) {
    // If already refreshing, wait for the refresh to complete
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        const retryCallback = (newToken: string): void => {
          const newHeaders = buildHeaders(newToken);
          executeRequest(url, method, newHeaders, body)
            .then(({ response: retryResponse, data: retryData }) => {
              if (!retryResponse.ok) {
                const errorData = retryData as ApiError;
                reject(new ApiClientError(errorData.error, retryResponse.status));
              } else {
                resolve(retryData as T);
              }
            })
            .catch((err: unknown) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        };
        subscribeTokenRefresh(retryCallback);
      });
    }

    // Start the refresh process
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // Notify waiting requests
        onTokenRefreshed(newAccessToken);
        isRefreshing = false;

        // Retry the original request with the new token
        const newHeaders = buildHeaders(newAccessToken);
        const { response: retryResponse, data: retryData } = await executeRequest(
          url,
          method,
          newHeaders,
          body
        );

        if (!retryResponse.ok) {
          const errorData = retryData as ApiError;
          throw new ApiClientError(errorData.error, retryResponse.status);
        }

        return retryData as T;
      } else {
        // Refresh failed - clear tokens and redirect to login
        isRefreshing = false;
        clearTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new ApiClientError(
          { code: 'AUTH_TOKEN_EXPIRED', message: 'Session expired. Please login again.' },
          401
        );
      }
    } catch (err: unknown) {
      isRefreshing = false;
      clearTokens();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // Handle no content response
  if (response.status === 204) {
    return undefined as T;
  }

  // Handle error responses
  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ApiClientError(errorData.error, response.status);
  }

  return data as T;
}

/**
 * Execute file upload request
 */
async function executeFileUpload(
  url: string,
  formData: FormData,
  token: string | null
): Promise<{ response: Response; data: unknown }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data: unknown = await response.json();
  return { response, data };
}

/**
 * Upload a file to the API with automatic token refresh
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  fieldName = 'photo'
): Promise<T> {
  const url = `${env.apiBaseUrl}/v1${endpoint}`;

  const formData = new FormData();
  formData.append(fieldName, file);

  const accessToken = getAccessToken();
  const { response, data } = await executeFileUpload(url, formData, accessToken);

  // Handle 401 errors with token refresh
  if (response.status === 401) {
    // If already refreshing, wait for the refresh to complete
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        const retryCallback = (newToken: string): void => {
          // Re-create formData since it may have been consumed
          const retryFormData = new FormData();
          retryFormData.append(fieldName, file);

          executeFileUpload(url, retryFormData, newToken)
            .then(({ response: retryResponse, data: retryData }) => {
              if (!retryResponse.ok) {
                const errorData = retryData as ApiError;
                reject(new ApiClientError(errorData.error, retryResponse.status));
              } else {
                resolve(retryData as T);
              }
            })
            .catch((err: unknown) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        };
        subscribeTokenRefresh(retryCallback);
      });
    }

    // Start the refresh process
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        onTokenRefreshed(newAccessToken);
        isRefreshing = false;

        // Re-create formData since it may have been consumed
        const retryFormData = new FormData();
        retryFormData.append(fieldName, file);

        const { response: retryResponse, data: retryData } = await executeFileUpload(
          url,
          retryFormData,
          newAccessToken
        );

        if (!retryResponse.ok) {
          const errorData = retryData as ApiError;
          throw new ApiClientError(errorData.error, retryResponse.status);
        }

        return retryData as T;
      } else {
        isRefreshing = false;
        clearTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new ApiClientError(
          { code: 'AUTH_TOKEN_EXPIRED', message: 'Session expired. Please login again.' },
          401
        );
      }
    } catch (err: unknown) {
      isRefreshing = false;
      clearTokens();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ApiClientError(errorData.error, response.status);
  }

  return data as T;
}

/**
 * Convenience methods
 */
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T>(endpoint: string, file: File, fieldName?: string) =>
    uploadFile<T>(endpoint, file, fieldName),
};
