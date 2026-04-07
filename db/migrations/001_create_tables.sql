-- Cake Auction Database Schema
-- All 6 tables for the school fundraiser auction system

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. AUCTIONS
-- status is only 'draft' or 'published' in DB; 'live' and 'closed' are computed from timestamps
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  imgbb_url TEXT,
  preview_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  close_at TIMESTAMPTZ,
  cake_submission_close_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  pickup_date TEXT,
  pickup_time TEXT,
  pickup_location TEXT,
  thank_you_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CAKES
CREATE TABLE cakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flavor TEXT,
  description TEXT,
  donor_name TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,
  beneficiary_kid TEXT,
  imgbb_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved')),
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_increment NUMERIC(10,2) NOT NULL DEFAULT 5,
  max_increment NUMERIC(10,2) NOT NULL DEFAULT 25,
  sort_order INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cakes_auction ON cakes(auction_id);

-- 3. BIDDERS
CREATE TABLE bidders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bidders_device_token ON bidders(device_token);

CREATE TABLE bidder_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES bidders(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, device_key)
);

CREATE INDEX idx_bidder_registrations_auction ON bidder_registrations(auction_id);
CREATE INDEX idx_bidder_registrations_bidder ON bidder_registrations(bidder_id);

-- 4. BIDS
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cake_id UUID NOT NULL REFERENCES cakes(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES bidders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  bid_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bids_cake ON bids(cake_id);
CREATE INDEX idx_bids_cake_amount ON bids(cake_id, amount DESC);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);

-- 5. RULES
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_auction ON rules(auction_id);

CREATE TABLE default_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO default_rules (rule_text, sort_order)
VALUES
  ('All sales are final - no refunds on winning bids', 0),
  ('Winning bidders must pick up their cakes at the designated time and location', 1),
  ('Payment is due at time of pickup', 2),
  ('Bidding closes at the posted end time - no exceptions', 3),
  ('In case of a tie, the earlier bid wins', 4),
  ('Minimum bid increments must be respected', 5),
  ('Have fun and bid generously - it''s all for a great cause!', 6);

-- 6. ADMIN SESSIONS
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token TEXT NOT NULL,
  authenticated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_admin_sessions_device_token ON admin_sessions(device_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
