'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Auction } from '@/types';

/* ── Types for results display ───────────────────────── */

interface CakeResult {
  cakeName: string;
  winnerName: string;
  winningBid: number;
  beneficiaryKid: string | null;
}

interface ResultsData {
  auction: Pick<Auction, 'title' | 'thank_you_msg' | 'pickup_date' | 'pickup_time' | 'pickup_location'>;
  grandTotal: number;
  cakeResults: CakeResult[];
  kidTotals: Record<string, number>;
}

/* ── Styles ──────────────────────────────────────────── */

const card: React.CSSProperties = {
  background: 'var(--public-panel)',
  borderRadius: '0.75rem',
  padding: '1.25rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  border: '1px solid var(--public-border)',
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
        const res = await fetch(`/api/results/${auctionId}`);
        if (!res.ok) {
          setError('Auction not found');
          return;
        }

        const payload = await res.json();
        const cakeResults: CakeResult[] = payload.winners.map((winner: {
          cake_name: string;
          winner_name: string | null;
          winning_bid: number | null;
          beneficiary_kid: string | null;
        }) => ({
          cakeName: winner.cake_name,
          winnerName: winner.winner_name || 'No bids',
          winningBid: Number(winner.winning_bid || 0),
          beneficiaryKid: winner.beneficiary_kid,
        }));

        const kidTotals = Object.fromEntries(
          (payload.perKidTotals as Array<{ kid_name: string; total_raised: number }>).map(
            (entry) => [entry.kid_name, Number(entry.total_raised)],
          ),
        );

        setData({
          auction: payload.auctionInfo,
          grandTotal: Number(payload.grandTotal || 0),
          cakeResults,
          kidTotals,
        });
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
            borderTopColor: '#1B3C6D',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#1B3C6D' }}>Loading results...</p>
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
      <div style={{ marginBottom: '1rem' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--public-accent)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Return to Auctions
        </a>
      </div>

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
              'repeating-linear-gradient(90deg, #E8602C 0 8px, #1B3C6D 8px 16px, #F07040 16px 24px, #1B3C6D 24px 32px, #C74E1F 32px 40px)',
            borderRadius: '2px',
          }}
        />
        <h2
          style={{
            marginTop: '1.25rem',
            fontSize: 'clamp(1.3rem, 4vw, 1.75rem)',
            color: 'var(--public-text)',
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
          background: 'var(--public-panel-soft)',
          border: '2px solid var(--public-text)',
        }}
      >
        <p style={{ margin: 0, color: 'var(--public-text)', fontSize: '0.9rem' }}>
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
          color: 'var(--public-text)',
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
                  color: 'var(--public-text)',
                  fontSize: '1.05rem',
                }}
              >
                {cr.cakeName}
              </p>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--public-text)', fontSize: '0.9rem' }}>
                {cr.winnerName !== 'No bids'
                  ? `Won by ${cr.winnerName}`
                  : 'No bids received'}
              </p>
              {cr.beneficiaryKid && (
                <p
                  style={{
                    margin: '0.3rem 0 0',
                    fontSize: '0.8rem',
                    color: 'var(--public-text-muted)',
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
              color: 'var(--public-text)',
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
                <span style={{ fontWeight: 600, color: 'var(--public-text)' }}>{kid}</span>
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
            background: 'var(--public-panel-soft)',
            border: '2px solid var(--public-text)',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem',
              color: 'var(--public-text)',
              fontSize: '1.1rem',
            }}
          >
            Pickup Information
          </h3>
          <p style={{ margin: '0.25rem 0', color: 'var(--public-text-muted)' }}>
            <strong>Date:</strong> {auction.pickup_date}
          </p>
          {auction.pickup_time && (
            <p style={{ margin: '0.25rem 0', color: 'var(--public-text-muted)' }}>
              <strong>Time:</strong> {auction.pickup_time}
            </p>
          )}
          {auction.pickup_location && (
            <p style={{ margin: '0.25rem 0', color: 'var(--public-text-muted)' }}>
              <strong>Location:</strong> {auction.pickup_location}
            </p>
          )}
          <a
            href={`/api/calendar/${auctionId}`}
            style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.6rem 1.25rem',
              background: '#E8602C',
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
            background: 'var(--public-panel-soft)',
            border: '2px solid var(--public-text)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.1rem',
              color: 'var(--public-text)',
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
            color: '#1B3C6D',
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
