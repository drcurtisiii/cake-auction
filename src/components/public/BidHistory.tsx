'use client';

import React, { useEffect, useState } from 'react';

interface BidEntry {
  id: string;
  cake_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  bidder_name: string;
}

interface BidHistoryProps {
  cakeId: string;
  isOpen: boolean;
}

function formatBidTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export const BidHistory: React.FC<BidHistoryProps> = ({ cakeId, isOpen }) => {
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !cakeId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/bids?cake_id=${encodeURIComponent(cakeId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load bids');
        return res.json();
      })
      .then((data: BidEntry[]) => {
        if (!cancelled) setBids(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cakeId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <h4 className="mb-2 text-sm font-semibold text-gray-700">Bid History</h4>

      {loading && (
        <p className="py-2 text-center text-sm text-gray-500">Loading bids...</p>
      )}

      {error && (
        <p className="py-2 text-center text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && bids.length === 0 && (
        <p className="py-2 text-center text-sm text-gray-500">
          No bids yet — be the first!
        </p>
      )}

      {!loading && !error && bids.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {bids.map((bid) => (
            <li key={bid.id} className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {bid.bidder_name}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatBidTime(bid.bid_time)}
                </span>
              </div>
              <span className="text-sm font-semibold text-green-700">
                {formatAmount(bid.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
