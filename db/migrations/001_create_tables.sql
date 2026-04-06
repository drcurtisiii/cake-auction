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
  preview_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  close_at TIMESTAMPTZ,
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
  beneficiary_kid TEXT,
  imgbb_url TEXT,
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_increment NUMERIC(10,2) NOT NULL DEFAULT 5,
  max_increment NUMERIC(10,2) NOT NULL DEFAULT 25,
  sort_order INT NOT NULL DEFAULT 0,
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

-- 6. ADMIN SESSIONS
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token TEXT NOT NULL,
  authenticated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_admin_sessions_device_token ON admin_sessions(device_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
