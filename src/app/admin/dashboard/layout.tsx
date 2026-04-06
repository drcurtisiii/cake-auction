'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <>
      <nav className="sticky top-0 z-30 flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <span className="text-lg font-bold text-[#7B1113]">
          Cake Auction Admin
        </span>

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </nav>

      {children}
    </>
  );
}
