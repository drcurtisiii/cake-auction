import type { Auction, EffectiveAuctionStatus, AuctionWithStatus } from '@/types';

/**
 * Computes the effective runtime status of an auction based on
 * its DB status and timestamp fields.
 */
export function getEffectiveStatus(auction: Auction): EffectiveAuctionStatus {
  if (auction.status === 'draft') {
    return 'draft';
  }

  // status === 'published'
  const now = new Date();
  const previewAt = auction.preview_at ? new Date(auction.preview_at) : null;
  const liveAt = auction.live_at ? new Date(auction.live_at) : null;
  const closeAt = auction.close_at ? new Date(auction.close_at) : null;

  // If closed
  if (closeAt && now >= closeAt) {
    return 'closed';
  }

  // If live
  if (liveAt && now >= liveAt) {
    return 'live';
  }

  // If preview_at exists and we're past it (but before live_at handled above)
  if (previewAt && now >= previewAt) {
    return 'preview';
  }

  // No preview_at and now < live_at, or no timestamps at all
  // Default fallback for published auctions
  return 'preview';
}

/**
 * Returns a copy of the auction with the computed effectiveStatus field.
 */
export function enrichAuctionWithStatus(auction: Auction): AuctionWithStatus {
  return {
    ...auction,
    effectiveStatus: getEffectiveStatus(auction),
  };
}
