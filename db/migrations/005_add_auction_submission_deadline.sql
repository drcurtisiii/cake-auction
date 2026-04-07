ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS cake_submission_close_at TIMESTAMPTZ;
