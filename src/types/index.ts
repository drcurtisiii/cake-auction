/* ───────────────────────────────────────────────────────
   Cake Auction – shared TypeScript types
   One type per database table, plus a few useful unions.
   ─────────────────────────────────────────────────────── */

// ─── Auction ─────────────────────────────────────────────

export type AuctionStatus = "draft" | "published";

export interface Auction {
  id: string;
  title: string;
  description?: string | null;
  imgbb_url?: string | null;
  preview_at?: string | null;
  live_at?: string | null;
  close_at?: string | null;
  status: AuctionStatus;
  pickup_date?: string | null;
  pickup_time?: string | null;
  pickup_location?: string | null;
  thank_you_msg?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Computed at runtime from the auction's timestamps.
 *  draft     – no preview/live/close window active
 *  preview   – now >= preview_at but < live_at
 *  live      – now >= live_at but < close_at
 *  closed    – now >= close_at
 */
export type EffectiveAuctionStatus = "draft" | "preview" | "live" | "closed";

export type AuctionWithStatus = Auction & {
  effectiveStatus: EffectiveAuctionStatus;
};

// ─── Cake ────────────────────────────────────────────────

export interface Cake {
  id: string;
  auction_id: string;
  name: string;
  flavor?: string | null;
  description?: string | null;
  donor_name?: string | null;
  submitter_email?: string | null;
  submitter_phone?: string | null;
  beneficiary_kid?: string | null;
  imgbb_url?: string | null;
  approval_status?: 'pending' | 'approved';
  starting_price: number;
  min_increment: number;
  max_increment: number;
  sort_order: number;
  submitted_at?: string;
  approved_at?: string | null;
  created_at: string;
}

// ─── Bidder ──────────────────────────────────────────────

export interface Bidder {
  id: string;
  name: string;
  phone: string;
  device_token: string;
  created_at: string;
}

// ─── Bid ─────────────────────────────────────────────────

export interface Bid {
  id: string;
  cake_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  created_at: string;
}

export type BidWithBidder = Bid & {
  bidder_name: string;
  bidder_phone?: string | null;
};

// ─── Rule ────────────────────────────────────────────────

export interface Rule {
  id: string;
  auction_id: string;
  rule_text: string;
  sort_order: number;
  created_at: string;
}

// ─── AdminSession ────────────────────────────────────────

export interface AdminSession {
  id: string;
  device_token: string;
  authenticated_at: string;
  expires_at: string;
}
