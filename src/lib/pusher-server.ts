import Pusher from 'pusher';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

/* ── Broadcast helpers ──────────────────────────────────── */

interface BidPayload {
  id: string;
  cake_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  bidder_name: string;
  bidder_phone?: string;
}

/**
 * Broadcasts a new bid to both public and private admin channels.
 * - Public channel: omits bidder_phone, truncates bid_time to the minute.
 * - Admin channel: includes full data with phone and exact millisecond time.
 */
export async function broadcastBid(auctionId: string, bid: BidPayload) {
  const publicChannel = `auction-${auctionId}`;
  const adminChannel = `private-admin-auction-${auctionId}`;

  // Truncate bid_time to the minute (drop seconds and beyond)
  const truncatedTime = bid.bid_time.slice(0, 16); // "YYYY-MM-DDTHH:MM"

  const { bidder_phone, ...publicBid } = bid;
  const publicPayload = { ...publicBid, bid_time: truncatedTime };

  await Promise.all([
    pusher.trigger(publicChannel, 'new-bid', publicPayload),
    pusher.trigger(adminChannel, 'new-bid', bid),
  ]);
}

/**
 * Broadcasts an auction state change (e.g. draft -> live -> closed)
 * to both public and admin channels.
 */
export async function broadcastAuctionStateChange(
  auctionId: string,
  newStatus: string
) {
  const publicChannel = `auction-${auctionId}`;
  const adminChannel = `private-admin-auction-${auctionId}`;
  const payload = { auctionId, status: newStatus };

  await Promise.all([
    pusher.trigger(publicChannel, 'auction-state-change', payload),
    pusher.trigger(adminChannel, 'auction-state-change', payload),
  ]);
}

/**
 * Broadcasts a newly added cake to the public channel.
 */
export async function broadcastNewCake(auctionId: string, cake: object) {
  await pusher.trigger(`auction-${auctionId}`, 'new-cake', cake);
}
