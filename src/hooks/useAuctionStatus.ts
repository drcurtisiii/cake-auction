'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Auction, EffectiveAuctionStatus } from '@/types';
import { getEffectiveStatus } from '@/lib/auction-status';

interface UseAuctionStatusReturn {
  effectiveStatus: EffectiveAuctionStatus;
  nextTransitionAt: Date | null;
}

/**
 * Computes the effective auction status and automatically transitions
 * when the next timestamp boundary is reached.
 */
export function useAuctionStatus(
  auction: Auction | null,
): UseAuctionStatusReturn {
  const computeStatus = useCallback((): EffectiveAuctionStatus => {
    if (!auction) return 'draft';
    return getEffectiveStatus(auction);
  }, [auction]);

  const computeNextTransition = useCallback(
    (status: EffectiveAuctionStatus): Date | null => {
      if (!auction) return null;

      const now = new Date();
      const liveAt = auction.live_at ? new Date(auction.live_at) : null;
      const closeAt = auction.close_at ? new Date(auction.close_at) : null;

      switch (status) {
        case 'preview':
          // Next transition is when bidding goes live
          if (liveAt && liveAt > now) return liveAt;
          // If no live_at, check close_at
          if (closeAt && closeAt > now) return closeAt;
          return null;

        case 'live':
          // Next transition is when the auction closes
          if (closeAt && closeAt > now) return closeAt;
          return null;

        case 'draft':
        case 'closed':
        default:
          // No automatic transition from draft or closed
          return null;
      }
    },
    [auction],
  );

  const [effectiveStatus, setEffectiveStatus] =
    useState<EffectiveAuctionStatus>(() => computeStatus());
  const [nextTransitionAt, setNextTransitionAt] = useState<Date | null>(() =>
    computeNextTransition(computeStatus()),
  );

  // Recompute when auction changes
  useEffect(() => {
    const status = computeStatus();
    setEffectiveStatus(status);
    setNextTransitionAt(computeNextTransition(status));
  }, [computeStatus, computeNextTransition]);

  // Set a timer for the next state transition
  useEffect(() => {
    if (!nextTransitionAt) return;

    const now = Date.now();
    const msUntilTransition = nextTransitionAt.getTime() - now;

    // Already past -- recompute immediately
    if (msUntilTransition <= 0) {
      const status = computeStatus();
      setEffectiveStatus(status);
      setNextTransitionAt(computeNextTransition(status));
      return;
    }

    // Cap at ~24 days to avoid setTimeout overflow (max ~2^31 ms)
    const safeDelay = Math.min(msUntilTransition, 2_000_000_000);

    const timerId = setTimeout(() => {
      const status = computeStatus();
      setEffectiveStatus(status);
      setNextTransitionAt(computeNextTransition(status));
    }, safeDelay);

    return () => clearTimeout(timerId);
  }, [nextTransitionAt, computeStatus, computeNextTransition]);

  return { effectiveStatus, nextTransitionAt };
}
