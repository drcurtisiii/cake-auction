'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Auction, Cake, Bid, Bidder } from '@/types';

/* ── Types for results display ───────────────────────── */

interface CakeResult {
  cakeName: string;
  winnerName: string;
  winningBid: number;
  beneficiaryKid: string | null;
}

interface ResultsData {
  auction: Auction;
  grandTotal: number;
  cakeResults: CakeResult[];
  kidTotals: Record<string, number>;
}

/* ── Styles ──────────────────────────────────────────── */

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '0.75rem',
  padding: '1.25rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  background: '#e8f5e9',
  color: '#2e7d32',
  fontWeight: 600,
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  fontSize: '0.85rem',
};

/* ── Component ───────────────────────────────────────── */

export default function ResultsPage() {
  const params = useParams();
  const auctionId = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        // Fetch auction, cakes, bids, and bidders in parallel
        const [auctionRes, cakesRes, bidsRes, biddersRes] = await Promise.all([
          fetch(`/api/auctions/${auctionId}`),
          fetch(`/api/cakes?auction_id=${auctionId}`),
          fetch(`/api/bids?auction_id=${auctionId}`),
          fetch(`/api/bidders`),
        ]);

        if (!auctionRes.ok) {
          setError('Auction not found');
          return;
        }

        const auction: Auction = await auctionRes.json();
        const cakes: Cake[] = await cakesRes.json();
        const bids: Bid[] = await bidsRes.json();
        const bidders: Bidder[] = await biddersRes.json();

        // Build a bidder lookup
        const bidderMap = new Map<string, string>();
        for (const b of bidders) {
          bidderMap.set(b.id, b.name);
        }

        // For each cake, find the highest bid
        const cakeResults: CakeResult[] = [];
        let grandTotal = 0;
        const kidTotals: Record<string, number> = {};

        for (const cake of cakes) {
          const cakeBids = bids
            .filter((b) => b.cake_id === cake.id)
            .sort((a, b) => b.amount - a.amount);

          if (cakeBids.length > 0) {
            const topBid = cakeBids[0];
            const winnerName = bidderMap.get(topBid.bidder_id) || 'Unknown';
            cakeResults.push({
              cakeName: cake.name,
              winnerName,
              winningBid: topBid.amount,
              beneficiaryKid: cake.beneficiary_kid || null,
            });
            grandTotal += topBid.amount;

            if (cake.beneficiary_kid) {
              kidTotals[cake.beneficiary_kid] =
                (kidTotals[cake.beneficiary_kid] || 0) + topBid.amount;
            }
          } else {
            cakeResults.push({
              cakeName: cake.name,
              winnerName: 'No bids',
              winningBid: 0,
              beneficiaryKid: cake.beneficiary_kid || null,
            });
          }
        }

        setData({ auction, grandTotal, cakeResults, kidTotals });
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [auctionId]);

  /* ── Loading State ─────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            border: '3px solid #e0e0e0',
            borderTopColor: '#8d6e63',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#8d6e63' }}>Loading results...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Error State ───────────────────────────────────── */

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#c62828', fontSize: '1.1rem' }}>
          {error || 'Something went wrong'}
        </p>
      </div>
    );
  }

  const { auction, grandTotal, cakeResults, kidTotals } = data;
  const hasKidTotals = Object.keys(kidTotals).length > 0;

  /* ── Render ────────────────────────────────────────── */

  return (
    <div>
      {/* Confetti-like accent dots */}
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'repeating-linear-gradient(90deg, #e53935 0 8px, #fdd835 8px 16px, #43a047 16px 24px, #1e88e5 24px 32px, #8e24aa 32px 40px)',
            borderRadius: '2px',
          }}
        />
        <h2
          style={{
            marginTop: '1.25rem',
            fontSize: 'clamp(1.3rem, 4vw, 1.75rem)',
            color: '#4a2c2a',
            fontWeight: 700,
          }}
        >
          {auction.title} &mdash; Results
        </h2>
      </div>

      {/* Grand Total */}
      <div
        style={{
          ...card,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #fff8e1, #fff3e0)',
          border: '2px solid #ffe082',
        }}
      >
        <p style={{ margin: 0, color: '#8d6e63', fontSize: '0.9rem' }}>
          Grand Total Raised
        </p>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: 'clamp(2rem, 6vw, 2.75rem)',
            fontWeight: 800,
            color: '#2e7d32',
          }}
        >
          ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Per-Cake Results */}
      <h3
        style={{
          color: '#5d4037',
          fontSize: '1.1rem',
          margin: '1.5rem 0 0.75rem',
        }}
      >
        Winning Bids
      </h3>

      {cakeResults.map((cr, i) => (
        <div key={i} style={card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: '#4a2c2a',
                  fontSize: '1.05rem',
                }}
              >
                {cr.cakeName}
              </p>
              <p style={{ margin: '0.2rem 0 0', color: '#8d6e63', fontSize: '0.9rem' }}>
                {cr.winnerName !== 'No bids'
                  ? `Won by ${cr.winnerName}`
                  : 'No bids received'}
              </p>
              {cr.beneficiaryKid && (
                <p
                  style={{
                    margin: '0.3rem 0 0',
                    fontSize: '0.8rem',
                    color: '#6d4c41',
                    fontStyle: 'italic',
                  }}
                >
                  Supporting: {cr.beneficiaryKid}
                </p>
              )}
            </div>
            <div>
              {cr.winningBid > 0 ? (
                <span style={badge}>
                  ${cr.winningBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              ) : (
                <span
                  style={{ ...badge, background: '#f5f5f5', color: '#9e9e9e' }}
                >
                  --
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Per-Kid Totals */}
      {hasKidTotals && (
        <>
          <h3
            style={{
              color: '#5d4037',
              fontSize: '1.1rem',
              margin: '1.5rem 0 0.75rem',
            }}
          >
            Fundraising by Student
          </h3>
          {Object.entries(kidTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([kid, total]) => (
              <div
                key={kid}
                style={{
                  ...card,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, color: '#4a2c2a' }}>{kid}</span>
                <span style={badge}>
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
        </>
      )}

      {/* Pickup Info */}
      {auction.pickup_date && (
        <div
          style={{
            ...card,
            marginTop: '1.5rem',
            background: 'linear-gradient(135deg, #e3f2fd, #e8eaf6)',
            border: '2px solid #90caf9',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem',
              color: '#1565c0',
              fontSize: '1.1rem',
            }}
          >
            Pickup Information
          </h3>
          <p style={{ margin: '0.25rem 0', color: '#37474f' }}>
            <strong>Date:</strong> {auction.pickup_date}
          </p>
          {auction.pickup_time && (
            <p style={{ margin: '0.25rem 0', color: '#37474f' }}>
              <strong>Time:</strong> {auction.pickup_time}
            </p>
          )}
          {auction.pickup_location && (
            <p style={{ margin: '0.25rem 0', color: '#37474f' }}>
              <strong>Location:</strong> {auction.pickup_location}
            </p>
          )}
          <a
            href={`/api/calendar/${auctionId}`}
            style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.6rem 1.25rem',
              background: '#1565c0',
              color: '#fff',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            Add to Calendar
          </a>
        </div>
      )}

      {/* Thank You Message */}
      {auction.thank_you_msg && (
        <div
          style={{
            ...card,
            marginTop: '1rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fce4ec, #f3e5f5)',
            border: '2px solid #f48fb1',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.1rem',
              color: '#6a1b9a',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            &ldquo;{auction.thank_you_msg}&rdquo;
          </p>
        </div>
      )}

      {/* Default thank you if none set */}
      {!auction.thank_you_msg && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            padding: '1rem',
            color: '#8d6e63',
          }}
        >
          <p style={{ fontSize: '1.1rem', fontStyle: 'italic' }}>
            Thank you for participating and supporting our cause!
          </p>
        </div>
      )}
    </div>
  );
}
