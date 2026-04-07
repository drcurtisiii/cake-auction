CREATE TABLE IF NOT EXISTS default_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO default_rules (rule_text, sort_order)
SELECT rule_text, sort_order
FROM (
  VALUES
    ('All sales are final - no refunds on winning bids', 0),
    ('Winning bidders must pick up their cakes at the designated time and location', 1),
    ('Payment is due at time of pickup', 2),
    ('Bidding closes at the posted end time - no exceptions', 3),
    ('In case of a tie, the earlier bid wins', 4),
    ('Minimum bid increments must be respected', 5),
    ('If pickup is not completed by the end of the pickup window, the auctioneer may call down the bidder list and offer the cake at each bidder''s last bid amount.', 6),
    ('Have fun and bid generously - it''s all for a great cause!', 7)
) AS defaults(rule_text, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM default_rules);
