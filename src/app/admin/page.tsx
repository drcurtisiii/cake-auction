'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAppTimeZoneDisplay } from '@/lib/timezone';

export default function AdminLoginPage() {
  const router = useRouter();
  const timeZoneDisplay = getAppTimeZoneDisplay();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json().catch(() => null);
        if (res.ok && data?.authenticated) {
          router.push('/admin/dashboard');
          return;
        }
      } catch {
        // Not authenticated, show login form
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get or create device token
      let deviceToken = localStorage.getItem('deviceToken');
      if (!deviceToken) {
        deviceToken = crypto.randomUUID();
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, deviceToken }),
      });

      if (res.ok) {
        localStorage.setItem('deviceToken', deviceToken);
        router.push('/admin/dashboard');
      } else {
        setError('Invalid passcode. Hint: today\'s date in MMDDYY format');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8602C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEF6]">
              <svg
                className="h-6 w-6 text-[#1B3C6D]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Login</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter today&apos;s date in the app timezone ({timeZoneDisplay}) as your passcode (MMDDYY)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="sr-only">
                Passcode
              </label>
              <input
                id="passcode"
                type="text"
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="000000"
                value={passcode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPasscode(val);
                  setError('');
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] placeholder:text-gray-300 focus:border-[#F07040] focus:outline-none focus:ring-2 focus:ring-[#E8602C]/20"
                autoFocus
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || passcode.length !== 6}
              className="w-full rounded-lg bg-[#E8602C] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C74E1F] focus:outline-none focus:ring-2 focus:ring-[#F07040] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
