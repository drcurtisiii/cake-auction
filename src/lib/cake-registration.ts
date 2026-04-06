import type { Auction } from '@/types';

export const CAKE_REGISTRATION_CLOSE_HOURS = 24;

export function getCakeRegistrationCutoff(auction: Pick<Auction, 'live_at'>): Date | null {
  if (!auction.live_at) return null;
  const liveAt = new Date(auction.live_at);
  return new Date(liveAt.getTime() - CAKE_REGISTRATION_CLOSE_HOURS * 60 * 60 * 1000);
}

export function isCakeRegistrationOpen(auction: Pick<Auction, 'status' | 'live_at'>): boolean {
  if (auction.status !== 'published') return false;
  const cutoff = getCakeRegistrationCutoff(auction);
  if (!cutoff) return false;
  return Date.now() < cutoff.getTime();
}
