/**
 * Environment configuration
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

interface EnvConfig {
  apiBaseUrl: string;
  enableGraphView: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getBoolEnvVar(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key] as string | undefined;
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

export const env: EnvConfig = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', '/api'),
  enableGraphView: getBoolEnvVar('VITE_ENABLE_GRAPH_VIEW', true),
};
