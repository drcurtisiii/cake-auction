'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ─── Types ─────────────────────────────────────────────

interface BidRecord {
  id: string;
  cake_id: string;
  cake_name: string;
  bidder_name: string;
  bidder_phone: string;
  amount: number;
  bid_time: string;
}

interface ReportData {
  allBids: BidRecord[];
  grandTotal: number;
}

// ─── Main Page ─────────────────────────────────────────

export default function MonitorPage() {
  const params = useParams();
  const auctionId = params.id as string;

  const [bids, setBids] = useState<BidRecord[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const prevBidCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${auctionId}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to load data');
      }
      const json: ReportData = await res.json();
      setBids(json.allBids);
      setGrandTotal(json.grandTotal);
      setLastUpdate(new Date());

      // Auto-scroll when new bids arrive
      if (json.allBids.length > prevBidCountRef.current && ledgerRef.current) {
        ledgerRef.current.scrollTop = 0;
      }
      prevBidCountRef.current = json.allBids.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Initial fetch + polling every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Live Monitor</h1>
        {lastUpdate && (
          <p className="text-xs text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Grand Total Counter */}
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 px-8 py-8 text-center text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wider text-green-200">
          Live Grand Total
        </p>
        <p className="mt-2 text-5xl font-extrabold tabular-nums">
          ${grandTotal.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-green-200">
          {bids.length} total bid{bids.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Live Bid Ledger */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Bid Ledger
        </h2>
        {bids.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">
              No bids yet. Waiting for activity...
            </p>
          </div>
        ) : (
          <div
            ref={ledgerRef}
            className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 shadow-sm"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cake
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Bidder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bids.map((bid, i) => (
                  <tr
                    key={bid.id}
                    className={i === 0 ? 'bg-green-50' : undefined}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {formatTime(bid.bid_time)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {bid.cake_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {bid.bidder_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      <a
                        href={`tel:${bid.bidder_phone}`}
                        className="text-[#7B1113] hover:underline"
                      >
                        {bid.bidder_phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-gray-900">
                      ${Number(bid.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Format a timestamp to show date and time to the second */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
