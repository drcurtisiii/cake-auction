'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

// ─── Types ─────────────────────────────────────────────

interface Winner {
  cake_id: string;
  cake_name: string;
  beneficiary_kid: string | null;
  winner_name: string | null;
  winner_phone: string | null;
  winning_bid: number | null;
  bid_time: string | null;
}

interface BidRecord {
  id: string;
  cake_id: string;
  cake_name: string;
  bidder_name: string;
  bidder_phone: string;
  amount: number;
  bid_time: string;
}

interface CakeStat {
  cake_name: string;
  starting_price: number;
  total_bids: number;
  winning_bid: number;
}

interface KidTotal {
  kid_name: string;
  total_raised: number;
}

interface ReportData {
  winners: Winner[];
  allBids: BidRecord[];
  grandTotal: number;
  perKidTotals: KidTotal[];
  cakeStats: CakeStat[];
}

// ─── No-show state: tracks which cakes have been marked ─

interface NoShowInfo {
  nextBidderName: string | null;
  nextBidderPhone: string | null;
}

// ─── Main Page ─────────────────────────────────────────

export default function ReportsPage() {
  const params = useParams();
  const auctionId = params.id as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCakes, setExpandedCakes] = useState<Set<string>>(new Set());
  const [noShows, setNoShows] = useState<Map<string, NoShowInfo>>(new Map());

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${auctionId}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to load report');
      }
      const json: ReportData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function toggleCake(cakeId: string) {
    setExpandedCakes((prev) => {
      const next = new Set(prev);
      if (next.has(cakeId)) next.delete(cakeId);
      else next.add(cakeId);
      return next;
    });
  }

  function handleNoShow(cakeId: string) {
    if (!data) return;
    // Find the second-highest bid for this cake
    const cakeBids = data.allBids
      .filter((b) => b.cake_id === cakeId)
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    if (cakeBids.length < 2) {
      setNoShows((prev) => {
        const next = new Map(prev);
        next.set(cakeId, { nextBidderName: null, nextBidderPhone: null });
        return next;
      });
      return;
    }

    const nextBid = cakeBids[1];
    setNoShows((prev) => {
      const next = new Map(prev);
      next.set(cakeId, {
        nextBidderName: nextBid.bidder_name,
        nextBidderPhone: nextBid.bidder_phone,
      });
      return next;
    });
  }

  function handleExportCsv() {
    window.open(`/api/reports/${auctionId}?format=csv`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auction Reports</h1>
        <Button onClick={handleExportCsv} variant="secondary" size="sm">
          Export CSV
        </Button>
      </div>

      {/* Grand Total Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#E8602C] to-[#1B3C6D] px-8 py-10 text-center text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wider text-[#E8EEF6]">
          Grand Total Raised
        </p>
        <p className="mt-2 text-5xl font-extrabold">
          ${data.grandTotal.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-[#E8EEF6]">
          {data.winners.filter((w) => w.winning_bid).length} cakes sold
        </p>
      </div>

      {/* Per-Kid Fundraising Breakdown */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Fundraising by Beneficiary
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.perKidTotals.map((kid) => (
            <div
              key={kid.kid_name}
              className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {kid.kid_name}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${kid.total_raised.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Winners Table */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Winners</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cake
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Winner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Winning Bid
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Beneficiary
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data.winners.map((w) => {
                const noShow = noShows.get(w.cake_id);
                return (
                  <tr key={w.cake_id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {w.cake_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {w.winner_name || '--'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {w.winner_phone ? (
                        <a
                          href={`tel:${w.winner_phone}`}
                          className="text-[#E8602C] hover:underline"
                        >
                          {w.winner_phone}
                        </a>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {w.winning_bid != null
                        ? `$${Number(w.winning_bid).toFixed(2)}`
                        : '--'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {w.beneficiary_kid || '--'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                      {w.winning_bid != null && (
                        <button
                          onClick={() => handleNoShow(w.cake_id)}
                          className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                        >
                          Mark No-Show
                        </button>
                      )}
                      {noShow && (
                        <div className="mt-1 text-xs text-gray-600">
                          {noShow.nextBidderName ? (
                            <>
                              Next: <span className="font-medium">{noShow.nextBidderName}</span>
                              {noShow.nextBidderPhone && (
                                <>
                                  {' '}
                                  <a
                                    href={`tel:${noShow.nextBidderPhone}`}
                                    className="text-[#E8602C] hover:underline"
                                  >
                                    {noShow.nextBidderPhone}
                                  </a>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-red-500">No other bidders</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cake Stats */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Cake Statistics
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cake
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Starting Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Bids
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Winning Bid
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data.cakeStats.map((cs) => (
                <tr key={cs.cake_name}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {cs.cake_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    ${Number(cs.starting_price).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {cs.total_bids}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                    ${Number(cs.winning_bid).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Full Bid History (collapsible per cake) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Full Bid History
        </h2>
        <div className="space-y-3">
          {data.winners.map((w) => {
            const cakeBids = data.allBids.filter(
              (b) => b.cake_id === w.cake_id,
            );
            const isExpanded = expandedCakes.has(w.cake_id);
            return (
              <div
                key={w.cake_id}
                className="rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => toggleCake(w.cake_id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {w.cake_name}{' '}
                    <span className="text-gray-500">
                      ({cakeBids.length} bid{cakeBids.length !== 1 ? 's' : ''})
                    </span>
                  </span>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {cakeBids.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">
                        No bids placed
                      </p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                              Time
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                              Bidder
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                              Phone
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cakeBids.map((bid) => (
                            <tr key={bid.id}>
                              <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                                {new Date(bid.bid_time).toLocaleString()}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                {bid.bidder_name}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                                <a
                                  href={`tel:${bid.bidder_phone}`}
                                  className="text-[#E8602C] hover:underline"
                                >
                                  {bid.bidder_phone}
                                </a>
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-right text-sm font-medium text-gray-900">
                                ${Number(bid.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
