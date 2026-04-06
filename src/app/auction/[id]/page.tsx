'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Auction, Cake, Rule, EffectiveAuctionStatus } from '@/types';
import { getEffectiveStatus } from '@/lib/auction-status';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CakeCard } from '@/components/public/CakeCard';
import { usePusherChannel } from '@/hooks/usePusher';

/* ------------------------------------------------------------------ */
/*  Countdown helper                                                   */
/* ------------------------------------------------------------------ */

function useCountdown(target: string | null | undefined) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!target) {
      setRemaining('');
      return;
    }

    function tick() {
      const diff = new Date(target!).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`,
      );
    }

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AuctionPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [cakes, setCakes] = useState<(Cake & { currentBid?: number; bidCount?: number })[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);

  /* ── Fetch data ────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const [auctionRes, cakesRes, rulesRes] = await Promise.all([
        fetch(`/api/auctions/${auctionId}`),
        fetch(`/api/cakes?auctionId=${auctionId}`),
        fetch(`/api/rules?auctionId=${auctionId}`),
      ]);

      if (!auctionRes.ok) throw new Error('Auction not found');

      const auctionData = await auctionRes.json();
      const cakesData = cakesRes.ok ? await cakesRes.json() : [];
      const rulesData = rulesRes.ok ? await rulesRes.json() : [];

      setAuction(auctionData);
      // Map highest_bid from the API to currentBid for CakeCard
      const mappedCakes = (Array.isArray(cakesData) ? cakesData : []).map(
        (c: Cake & { highest_bid?: number; currentBid?: number }) => ({
          ...c,
          currentBid: c.currentBid ?? (c.highest_bid ? Number(c.highest_bid) : undefined),
        }),
      );
      setCakes(mappedCakes);
      setRules(Array.isArray(rulesData) ? rulesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Pusher real-time updates ─────────────────────────── */

  const { bind, unbind } = usePusherChannel(auctionId);

  useEffect(() => {
    // On 'new-bid': update the cake's current bid in local state
    const handleNewBid = (data: { cake_id: string; amount: number }) => {
      setCakes((prev) =>
        prev.map((cake) =>
          cake.id === data.cake_id
            ? { ...cake, currentBid: Number(data.amount) }
            : cake,
        ),
      );
    };

    // On 'auction-state-change': re-fetch auction data
    const handleAuctionStateChange = () => {
      fetchData();
    };

    // On 'new-cake': add the cake to local state
    const handleNewCake = (data: Cake & { highest_bid?: number }) => {
      setCakes((prev) => {
        // Avoid duplicates
        if (prev.some((c) => c.id === data.id)) return prev;
        return [
          ...prev,
          {
            ...data,
            currentBid: data.highest_bid ? Number(data.highest_bid) : undefined,
          },
        ];
      });
    };

    bind('new-bid', handleNewBid);
    bind('auction-state-change', handleAuctionStateChange);
    bind('new-cake', handleNewCake);

    return () => {
      unbind('new-bid', handleNewBid);
      unbind('auction-state-change', handleAuctionStateChange);
      unbind('new-cake', handleNewCake);
    };
  }, [bind, unbind, fetchData]);

  /* ── Derived state ─────────────────────────────────────── */

  const effectiveStatus: EffectiveAuctionStatus = auction
    ? getEffectiveStatus(auction)
    : 'draft';

  const countdownTarget =
    effectiveStatus === 'preview'
      ? auction?.live_at
      : effectiveStatus === 'live'
        ? auction?.close_at
        : null;

  const countdown = useCountdown(countdownTarget);

  /* ── Bid handler (placeholder — will connect to bid API) ── */

  const handleBidClick = useCallback((cakeId: string, amount: number) => {
    // TODO: open bid confirmation modal / call bid API
    console.log('Bid', { cakeId, amount });
  }, []);

  /* ── Render helpers ────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F0F4F9] to-white">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500">Loading auction...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F0F4F9] to-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Oops!</h1>
          <p className="mt-2 text-gray-500">{error || 'Auction not found.'}</p>
        </div>
      </div>
    );
  }

  if (effectiveStatus === 'draft') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F0F4F9] to-white px-4">
        <div className="text-center">
          <span className="text-5xl" aria-hidden="true">🔒</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            This auction is not yet available
          </h1>
          <p className="mt-2 text-gray-500">
            Check back later once the organizer publishes it.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main layout ───────────────────────────────────────── */

  return (
    <div className="min-h-screen" style={{ background: 'var(--public-page-bg)' }}>
      {/* ── Status banner ────────────────────────────────── */}
      {effectiveStatus === 'preview' && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-blue-800">
            Bidding opens soon!{' '}
            {countdown && (
              <span className="font-mono text-blue-600">{countdown}</span>
            )}
          </p>
        </div>
      )}

      {effectiveStatus === 'live' && (
        <div className="border-b border-green-200 bg-green-50 px-4 py-3 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-green-800">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            Bidding is LIVE!{' '}
            {countdown && (
              <span className="font-mono text-green-600">
                Closes in {countdown}
              </span>
            )}
          </p>
        </div>
      )}

      {effectiveStatus === 'closed' && (
        <div className="border-b border-gray-200 bg-gray-100 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-gray-700">
            Auction Closed{' '}
            <a
              href={`/auction/${auctionId}/results`}
              className="ml-1 text-[#E8602C] underline hover:text-[#C74E1F]"
            >
              View results
            </a>
          </p>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <header className="mx-auto max-w-5xl px-4 pb-4 pt-8 text-center sm:pt-12">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Badge variant={effectiveStatus}>
            {effectiveStatus === 'preview'
              ? 'Preview'
              : effectiveStatus === 'live'
                ? 'Live'
                : 'Closed'}
          </Badge>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: 'var(--public-text-strong)' }}>
          {auction.title}
        </h1>

        {auction.description && (
          <p className="mx-auto mt-3 max-w-2xl text-base" style={{ color: 'var(--public-text-muted)' }}>
            {auction.description}
          </p>
        )}

        {auction.imgbb_url && (
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-3xl border shadow-sm" style={{ borderColor: 'var(--public-border)' }}>
            <img
              src={auction.imgbb_url}
              alt={auction.title}
              className="h-56 w-full object-cover sm:h-72"
            />
          </div>
        )}

        {effectiveStatus === 'preview' && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: 'var(--public-border)',
                background: 'var(--public-panel)',
                color: 'var(--public-text)',
              }}
            >
              Return to Auctions List
            </a>
            <a
              href={`/api/calendar/${auctionId}`}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ background: 'var(--public-accent)' }}
            >
              Add to Calendar
            </a>
          </div>
        )}
      </header>

      {/* ── Cake grid ────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">
        {cakes.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--public-text-muted)' }}>
            No cakes have been added to this auction yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cakes.map((cake) => (
              <CakeCard
                key={cake.id}
                cake={cake}
                auctionStatus={effectiveStatus}
                onBidClick={handleBidClick}
              />
            ))}
          </div>
        )}

        {/* ── Rules (collapsible) ────────────────────────── */}
        {rules.length > 0 && (
          <section className="mx-auto mt-12 max-w-3xl">
            <button
              onClick={() => setRulesOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-left shadow-sm transition-colors hover:opacity-95"
              style={{
                border: '1px solid var(--public-border)',
                background: 'var(--public-panel)',
              }}
            >
              <span className="text-base font-semibold" style={{ color: 'var(--public-text-strong)' }}>
                Auction Rules
              </span>
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  rulesOpen ? 'rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            {rulesOpen && (
              <div
                className="mt-2 rounded-xl px-5 py-4 shadow-sm"
                style={{
                  border: '1px solid var(--public-border)',
                  background: 'var(--public-panel)',
                }}
              >
                <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--public-text-muted)' }}>
                  {rules
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((rule) => (
                      <li key={rule.id}>{rule.rule_text}</li>
                    ))}
                </ol>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
