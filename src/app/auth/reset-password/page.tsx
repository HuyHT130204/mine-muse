'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState<boolean | null>(null);
  const [linkUsed, setLinkUsed] = useState(false);

  useEffect(() => {
    const checkResetLink = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      try {
        // Check if link was already used
        const linkUsedBefore = localStorage.getItem('reset_link_used');
        if (linkUsedBefore === 'permanent') {
          setError('This reset link has already been used. Please request a new password reset.');
          setIsValidLink(false);
          setLinkUsed(true);
          return;
        }

        // Check if we have tokens in URL
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        console.log('URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        // Check if this is a password recovery link
        if (type === 'recovery' && accessToken && refreshToken) {
          // Set the session with the tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Session error:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidLink(false);
            return;
          }

          // Check if user is authenticated
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('User authenticated:', user.email);
            setIsValidLink(true);
            // Store that this link is being used (temporarily)
            localStorage.setItem('reset_link_used', 'temporary');
          } else {
            setError('Invalid reset link. Please request a new password reset.');
            setIsValidLink(false);
          }
        } else {
          // Try to get current session (might be set automatically by Supabase)
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('Session found:', session.user.email);
            setIsValidLink(true);
            // Store that this link is being used (temporarily)
            localStorage.setItem('reset_link_used', 'temporary');
          } else {
            setError('Invalid reset link. Please request a new password reset.');
            setIsValidLink(false);
          }
        }
      } catch (err) {
        console.error('Reset link check error:', err);
        setError('Invalid reset link. Please request a new password reset.');
        setIsValidLink(false);
      }
    };

    checkResetLink();
  }, [searchParams]);

  // Clear temporary tracking when component unmounts (user leaves page)
  useEffect(() => {
    return () => {
      const linkUsed = localStorage.getItem('reset_link_used');
      if (linkUsed === 'temporary') {
        localStorage.removeItem('reset_link_used');
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if link is valid
    if (!isValidLink) {
      setError('Invalid reset link. Please request a new password reset.');
      setLoading(false);
      return;
    }

    // Check if link was permanently used
    const linkUsedBefore = localStorage.getItem('reset_link_used');
    if (linkUsedBefore === 'permanent') {
      setError('This reset link has already been used. Please request a new password reset.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Mark link as permanently used
      localStorage.setItem('reset_link_used', 'permanent');
      setLinkUsed(true);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? (err as { message: string }).message 
        : 'Failed to update password';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Password Updated</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking link validity
  if (isValidLink === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if link is invalid or already used
  if (!isValidLink || linkUsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Invalid Reset Link</h2>
            <p className="mt-2 text-sm text-gray-600">
              {error || 'This reset link is invalid or has already been used.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter new password"
              minLength={6}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
