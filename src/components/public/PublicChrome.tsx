'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const THEME_KEY = 'cake-auction-theme';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function PublicChrome() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('light');
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      const nextTheme = saved === 'dark' ? 'dark' : 'light';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    } catch {
      applyTheme('light');
    }
  }, []);

  if (isAdminPage) {
    return null;
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // ignore storage failures
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        className="fixed right-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-transform hover:scale-105"
        style={{
          background: 'var(--public-panel-soft)',
          borderColor: 'var(--public-border)',
          color: 'var(--public-text-strong)',
        }}
      >
        {theme === 'light' ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c0 .34-.01.67-.01 1.01A8 8 0 0 0 20 12c0 .27 0 .53-.01.79Z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
          </svg>
        )}
      </button>

      <Link
        href="/admin"
        aria-label="Open admin"
        title="Admin"
        className="fixed bottom-5 right-5 z-[60] h-4 w-4 rounded-full transition-all hover:scale-110"
        style={{
          background: 'var(--public-accent)',
          boxShadow: '0 0 0 6px rgba(255,255,255,0.18)',
        }}
      />
    </>
  );
}
