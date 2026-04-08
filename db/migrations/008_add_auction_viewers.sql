CREATE TABLE IF NOT EXISTS auction_viewers (
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  page_kind TEXT NOT NULL CHECK (page_kind IN ('public', 'admin')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (auction_id, viewer_key, page_kind)
);

CREATE INDEX IF NOT EXISTS idx_auction_viewers_recent
  ON auction_viewers (auction_id, last_seen_at DESC);
