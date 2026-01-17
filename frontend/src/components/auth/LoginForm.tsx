/**
 * Login form component
 */

import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ApiClientError } from '@/services/api';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginForm(): ReactNode {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        await login(formData);
      } catch (error) {
        if (error instanceof ApiClientError) {
          if (error.code === 'AUTH_INVALID_CREDENTIALS') {
            setErrors({ general: 'Invalid email or password' });
          } else {
            setErrors({ general: error.message });
          }
        } else {
          setErrors({ general: 'An unexpected error occurred' });
        }
      }
    },
    [formData, login, validateForm]
  );

  const handleInputChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field] ?? errors.general) {
        setErrors({});
      }
    },
    [errors]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(107 114 128) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      <Card className="w-full max-w-md relative z-10" padding="lg" shadow="lg">
        <div className="text-center mb-8">
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Personal CRM</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your network with ease</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="bg-white border-gray-300"
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={errors.password}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="bg-white border-gray-300"
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span className="ml-2 text-gray-700">Remember me</span>
            </label>
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Forgot password?</a>
          </div>

          <Button type="submit" className="w-full transition-all duration-150" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Build and manage meaningful connections</p>
        </div>
      </Card>
    </div>
  );
}
