'use client';

import { useEffect, useMemo, useState } from 'react';

type PageKind = 'public' | 'admin';

export function useAuctionViewerCount(
  auctionId: string,
  pageKind: PageKind,
  enabled: boolean,
) {
  const [viewerCount, setViewerCount] = useState(0);

  const storageKey = useMemo(
    () => `cake-auction-viewer-${pageKind}-${auctionId}`,
    [auctionId, pageKind],
  );

  useEffect(() => {
    if (!enabled || !auctionId || typeof window === 'undefined') return;

    let cancelled = false;
    let viewerKey = sessionStorage.getItem(storageKey);
    if (!viewerKey) {
      viewerKey = crypto.randomUUID();
      sessionStorage.setItem(storageKey, viewerKey);
    }

    async function sendHeartbeat() {
      try {
        const res = await fetch(`/api/auctions/${auctionId}/viewers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewerKey, pageKind }),
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok) {
          setViewerCount(Number(data?.viewerCount ?? 0));
        }
      } catch {
        // Ignore transient viewer heartbeat errors.
      }
    }

    void sendHeartbeat();
    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [auctionId, enabled, pageKind, storageKey]);

  return viewerCount;
}
