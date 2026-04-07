CREATE TABLE IF NOT EXISTS bidder_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES bidders(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, device_key)
);

CREATE INDEX IF NOT EXISTS idx_bidder_registrations_auction
  ON bidder_registrations(auction_id);

CREATE INDEX IF NOT EXISTS idx_bidder_registrations_bidder
  ON bidder_registrations(bidder_id);
