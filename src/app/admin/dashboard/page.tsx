'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Auction, AuctionWithStatus } from '@/types';
import { enrichAuctionWithStatus } from '@/lib/auction-status';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const res = await fetch('/api/auctions');
        if (!res.ok) throw new Error('Failed to fetch auctions');
        const data: Auction[] = await res.json();
        setAuctions(data.map(enrichAuctionWithStatus));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchAuctions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auctions</h1>
        <Button onClick={() => router.push('/admin/auctions/new')}>
          Create Auction
        </Button>
      </div>

      {/* Auction list */}
      {auctions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-gray-700">
            No auctions yet
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first cake auction.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push('/admin/auctions/new')}
          >
            Create Auction
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {auctions.map((auction) => (
            <Card
              key={auction.id}
              onClick={() => router.push(`/admin/auctions/${auction.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="truncate text-lg font-semibold text-gray-900">
                      {auction.title}
                    </h2>
                    <Badge variant={auction.effectiveStatus}>
                      {auction.effectiveStatus}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-500 sm:grid-cols-3">
                    <div>
                      <dt className="font-medium text-gray-600">Preview</dt>
                      <dd>{formatDate(auction.preview_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-600">Live</dt>
                      <dd>{formatDate(auction.live_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-600">Close</dt>
                      <dd>{formatDate(auction.close_at)}</dd>
                    </div>
                  </dl>
                </div>

                <span className="shrink-0 text-sm font-medium text-[#E8602C]">
                  Edit &rarr;
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
