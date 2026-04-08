'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Auction, Cake, Rule, EffectiveAuctionStatus } from '@/types';
import { getEffectiveStatus } from '@/lib/auction-status';
import { generateBidAmounts } from '@/lib/bid-buttons';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CakeCard } from '@/components/public/CakeCard';
import { BidderRegistration } from '@/components/public/BidderRegistration';
import { BidHistory } from '@/components/public/BidHistory';
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

function sortCakesForDisplay(
  list: (Cake & { currentBid?: number; bidCount?: number })[],
  favorites: string[],
) {
  const favoriteSet = new Set(favorites);
  const alphabetical = [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  return alphabetical.sort((a, b) => {
    const aFav = favoriteSet.has(a.id) ? 1 : 0;
    const bFav = favoriteSet.has(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AuctionPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;
  const bidderStorageKey = `cake-auction-bidder-${auctionId}`;
  const favoriteStorageKey = `cake-auction-favorites-${auctionId}`;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [cakes, setCakes] = useState<(Cake & { currentBid?: number; bidCount?: number })[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bidder, setBidder] = useState<{
    id: string;
    name: string;
    phone: string;
    device_token: string;
  } | null>(null);
  const [deviceKey, setDeviceKey] = useState('');
  const [showBidderModal, setShowBidderModal] = useState(false);
  const [pendingBid, setPendingBid] = useState<{ cakeId: string; amount: number } | null>(null);
  const [bidMessage, setBidMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [placingBid, setPlacingBid] = useState(false);
  const [selectedCake, setSelectedCake] = useState<(Cake & {
    currentBid?: number;
    bidCount?: number;
    highest_bidder_name?: string | null;
  }) | null>(null);
  const [favoriteCakeIds, setFavoriteCakeIds] = useState<string[]>([]);

  /* ── Fetch data ────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const [auctionRes, cakesRes, rulesRes] = await Promise.all([
        fetch(`/api/auctions/${auctionId}`, { cache: 'no-store' }),
        fetch(`/api/cakes?auctionId=${auctionId}`, { cache: 'no-store' }),
        fetch(`/api/rules?auctionId=${auctionId}`, { cache: 'no-store' }),
      ]);

      if (!auctionRes.ok) throw new Error('Auction not found');

      const auctionData = await auctionRes.json();
      const cakesData = cakesRes.ok ? await cakesRes.json() : [];
      const rulesData = rulesRes.ok ? await rulesRes.json() : [];

      setAuction(auctionData);
      // Map highest_bid from the API to currentBid for CakeCard
      const mappedCakes = (Array.isArray(cakesData) ? cakesData : []).map(
        (c: Cake & {
          highest_bid?: number;
          currentBid?: number;
          bid_count?: number;
          highest_bidder_name?: string | null;
        }) => ({
          ...c,
          currentBid: c.currentBid ?? (c.highest_bid ? Number(c.highest_bid) : undefined),
          bidCount: c.bid_count ?? 0,
        }),
      );
      setCakes(mappedCakes);
      setSelectedCake((prev) =>
        prev ? mappedCakes.find((cake) => cake.id === prev.id) ?? null : prev,
      );
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

  useEffect(() => {
    const storageKey = 'cake-auction-device-key';
    let storedDeviceKey = localStorage.getItem(storageKey);
    if (!storedDeviceKey) {
      storedDeviceKey = crypto.randomUUID();
      localStorage.setItem(storageKey, storedDeviceKey);
    }
    setDeviceKey(storedDeviceKey);
  }, []);

  useEffect(() => {
    const storedFavorites = localStorage.getItem(favoriteStorageKey);
    if (!storedFavorites) return;
    try {
      const parsed = JSON.parse(storedFavorites);
      if (Array.isArray(parsed)) {
        setFavoriteCakeIds(
          parsed.filter((value): value is string => typeof value === 'string'),
        );
      }
    } catch {
      // Ignore malformed favorite state
    }
  }, [favoriteStorageKey]);

  useEffect(() => {
    if (!auctionId || !deviceKey) return;

    let cancelled = false;

    async function loadRegisteredBidder() {
      try {
        const storedBidderId = localStorage.getItem(bidderStorageKey);
        const res = await fetch(
          `/api/bidders?auction_id=${encodeURIComponent(auctionId)}&device_key=${encodeURIComponent(deviceKey)}`,
          { cache: 'no-store' },
        );

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.registered || !data?.bidder) {
          if (!cancelled) {
            setBidder(null);
            localStorage.removeItem(bidderStorageKey);
          }
          return;
        }

        if (!cancelled) {
          setBidder(data.bidder);
          if (data.bidder.id && storedBidderId !== data.bidder.id) {
            localStorage.setItem(bidderStorageKey, data.bidder.id);
          }
        }
      } catch {
        if (!cancelled) {
          setBidder(null);
        }
      }
    }

    loadRegisteredBidder();
    return () => {
      cancelled = true;
    };
  }, [auctionId, bidderStorageKey, deviceKey]);

  /* ── Pusher real-time updates ─────────────────────────── */

  const { bind, unbind, connectionState } = usePusherChannel(auctionId);

  useEffect(() => {
    const handleNewBid = (data: {
      cake_id: string;
      amount: number;
      bid_count?: number;
      bidder_name?: string;
      highest_bidder_name?: string;
    }) => {
      setCakes((prev) =>
        prev.map((cake) =>
          cake.id === data.cake_id
            ? {
                ...cake,
                currentBid: Number(data.amount),
                highest_bid: Number(data.amount),
                bidCount: data.bid_count ?? cake.bidCount ?? 0,
                bid_count: data.bid_count ?? cake.bid_count ?? 0,
                highest_bidder_name:
                  data.highest_bidder_name ?? data.bidder_name ?? cake.highest_bidder_name ?? null,
              }
            : cake,
        ),
      );
      setSelectedCake((prev) =>
        prev && prev.id === data.cake_id
          ? {
              ...prev,
              currentBid: Number(data.amount),
              highest_bid: Number(data.amount),
              bidCount: data.bid_count ?? prev.bidCount ?? 0,
              bid_count: data.bid_count ?? prev.bid_count ?? 0,
              highest_bidder_name:
                data.highest_bidder_name ?? data.bidder_name ?? prev.highest_bidder_name ?? null,
            }
          : prev,
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

  const liveStatusForPolling: EffectiveAuctionStatus = auction
    ? getEffectiveStatus(auction)
    : 'draft';

  useEffect(() => {
    if (liveStatusForPolling !== 'live') return;
    const intervalMs = connectionState === 'connected' ? 15000 : 4000;
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [connectionState, fetchData, liveStatusForPolling]);

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
  const alphabeticalLotOrder = [...cakes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  const lotNumberByCakeId = new Map(
    alphabeticalLotOrder.map((cake, index) => [cake.id, index + 1]),
  );
  const displayedCakes = sortCakesForDisplay(cakes, favoriteCakeIds);

  /* ── Bid handler (placeholder — will connect to bid API) ── */

  const placeBid = useCallback(
    async (cakeId: string, amount: number, bidderId: string) => {
      if (!deviceKey) {
        setBidMessage({ type: 'error', text: 'Unable to identify this device. Refresh and try again.' });
        return;
      }

      setPlacingBid(true);
      setBidMessage(null);
      try {
        const res = await fetch('/api/bids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cake_id: cakeId,
            bidder_id: bidderId,
            device_key: deviceKey,
            amount,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          await fetchData();
          throw new Error(data?.error || 'Failed to place bid');
        }

        await fetchData();
        setBidMessage({ type: 'success', text: `Bid of $${amount.toFixed(2)} placed.` });
      } catch (err) {
        setBidMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to place bid',
        });
      } finally {
        setPlacingBid(false);
      }
    },
    [deviceKey, fetchData],
  );

  const handleBidClick = useCallback(
    (cakeId: string, amount: number) => {
      if (!bidder) {
        setPendingBid({ cakeId, amount });
        setShowBidderModal(true);
        return;
      }

      void placeBid(cakeId, amount, bidder.id);
    },
    [bidder, placeBid],
  );

  const handleRegistered = useCallback(
    (registeredBidder: {
      id: string;
      name: string;
      phone: string;
      device_token: string;
    }) => {
      setBidder(registeredBidder);
      localStorage.setItem(bidderStorageKey, registeredBidder.id);
      setShowBidderModal(false);

      if (pendingBid) {
        void placeBid(pendingBid.cakeId, pendingBid.amount, registeredBidder.id);
        setPendingBid(null);
      }
    },
    [bidderStorageKey, pendingBid, placeBid],
  );

  const handleToggleFavorite = useCallback(
    (cakeId: string) => {
      setFavoriteCakeIds((prev) => {
        const next = prev.includes(cakeId)
          ? prev.filter((id) => id !== cakeId)
          : [...prev, cakeId];
        localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
        return next;
      });
    },
    [favoriteStorageKey],
  );

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
          {effectiveStatus === 'preview' && (
            <>
              <a
                href={`/cakeregistration?auction=${auctionId}`}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
                style={{
                  borderColor: 'var(--public-border)',
                  background: 'var(--public-panel)',
                  color: 'var(--public-text)',
                }}
              >
                Submit Cake
              </a>
              <a
                href={`/api/calendar/${auctionId}`}
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: 'var(--public-accent)' }}
              >
                Add to Calendar
              </a>
            </>
          )}
        </div>
      </header>

      {/* ── Cake grid ────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">
        {bidMessage && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm ${
              bidMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {bidMessage.text}
          </div>
        )}

        {displayedCakes.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--public-text-muted)' }}>
            No cakes have been added to this auction yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedCakes.map((cake) => (
              <CakeCard
                key={cake.id}
                cake={cake}
                lotNumber={lotNumberByCakeId.get(cake.id) ?? 0}
                isFavorite={favoriteCakeIds.includes(cake.id)}
                auctionStatus={effectiveStatus}
                onBidClick={handleBidClick}
                onOpenDetails={setSelectedCake}
                onToggleFavorite={handleToggleFavorite}
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

      <BidderRegistration
        isOpen={showBidderModal}
        onClose={() => {
          setShowBidderModal(false);
          setPendingBid(null);
        }}
        auctionId={auctionId}
        deviceKey={deviceKey}
        onRegistered={handleRegistered}
      />

      <Modal
        isOpen={selectedCake !== null}
        onClose={() => setSelectedCake(null)}
        title={selectedCake?.name || 'Cake Details'}
      >
        {selectedCake && (
          <div className="space-y-4">
            {selectedCake.imgbb_url && (
              <img
                src={selectedCake.imgbb_url}
                alt={selectedCake.name}
                className="h-52 w-full rounded-xl object-cover"
              />
            )}
            <div className="space-y-2 text-sm text-gray-600">
              {selectedCake.flavor && <p><span className="font-medium text-gray-900">Flavor:</span> {selectedCake.flavor}</p>}
              {selectedCake.donor_name && <p><span className="font-medium text-gray-900">Donated by:</span> {selectedCake.donor_name}</p>}
              <p><span className="font-medium text-gray-900">Cake number:</span> #{lotNumberByCakeId.get(selectedCake.id) ?? 0}</p>
              <p><span className="font-medium text-gray-900">Current bid:</span> ${(selectedCake.currentBid ?? selectedCake.starting_price).toFixed(2)}</p>
              <p><span className="font-medium text-gray-900">Leading bidder:</span> {selectedCake.highest_bidder_name || 'N/A'}</p>
            </div>

            {effectiveStatus === 'live' && (
              <div className="grid grid-cols-2 gap-2">
                {generateBidAmounts(
                  selectedCake.currentBid ?? selectedCake.starting_price,
                  selectedCake.min_increment,
                ).map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={placingBid}
                    onClick={() => handleBidClick(selectedCake.id, amount)}
                    className="rounded-lg bg-[#E8602C] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C74E1F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Bid ${amount.toFixed(2)}
                  </button>
                ))}
              </div>
            )}

            <BidHistory cakeId={selectedCake.id} isOpen />
          </div>
        )}
      </Modal>
    </div>
  );
}
