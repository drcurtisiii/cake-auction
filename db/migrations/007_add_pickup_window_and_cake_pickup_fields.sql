ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS pickup_end_time TEXT;

ALTER TABLE cakes
  ADD COLUMN IF NOT EXISTS picked_up BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS final_amount_paid NUMERIC(10,2);

INSERT INTO default_rules (rule_text, sort_order)
SELECT
  'If pickup is not completed by the end of the pickup window, the auctioneer may call down the bidder list and offer the cake at each bidder''s last bid amount.',
  COALESCE((SELECT MAX(sort_order) + 1 FROM default_rules), 0)
WHERE NOT EXISTS (
  SELECT 1
  FROM default_rules
  WHERE rule_text = 'If pickup is not completed by the end of the pickup window, the auctioneer may call down the bidder list and offer the cake at each bidder''s last bid amount.'
);
