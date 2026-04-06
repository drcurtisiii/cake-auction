'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuctionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const [auctionTitle, setAuctionTitle] = useState<string>('');

  useEffect(() => {
    async function fetchTitle() {
      try {
        const res = await fetch(`/api/auctions/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setAuctionTitle(data.title);
        }
      } catch {
        // Breadcrumb will just show "Auction" as fallback
      }
    }
    if (params.id) fetchTitle();
  }, [params.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-gray-500">
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="hover:text-[#E8602C] transition-colors"
        >
          Dashboard
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">
          {auctionTitle || 'Auction'}
        </span>
      </nav>

      {children}
    </div>
  );
}
