'use client';

import React from 'react';
import type { Cake, EffectiveAuctionStatus } from '@/types';
import { generateBidAmounts } from '@/lib/bid-buttons';

interface CakeCardProps {
  cake: Cake & { currentBid?: number; bidCount?: number };
  lotNumber: number;
  isFavorite: boolean;
  auctionStatus: EffectiveAuctionStatus;
  onBidClick: (cakeId: string, amount: number) => void;
  onOpenDetails: (cake: Cake & { currentBid?: number; bidCount?: number }) => void;
  onToggleFavorite: (cakeId: string) => void;
}

/** Random warm background for the placeholder when there is no image */
const placeholderColors = [
  'from-orange-400 to-blue-300',
  'from-[#F07040] to-[#1B3C6D]',
  'from-blue-400 to-orange-300',
  'from-[#1B3C6D] to-[#E8602C]',
  'from-orange-300 to-blue-400',
  'from-[#E8602C] to-[#1B3C6D]',
];

function placeholderGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return placeholderColors[Math.abs(hash) % placeholderColors.length];
}

export const CakeCard: React.FC<CakeCardProps> = ({
  cake,
  lotNumber,
  isFavorite,
  auctionStatus,
  onBidClick,
  onOpenDetails,
  onToggleFavorite,
}) => {
  const currentPrice = cake.currentBid ?? cake.starting_price;
  const bidAmounts = generateBidAmounts(
    currentPrice,
    cake.min_increment,
  );
  const isLive = auctionStatus === 'live';
  const isClosed = auctionStatus === 'closed';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(cake)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails(cake);
        }
      }}
      className="group flex flex-col overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-lg"
      style={{
        border: '1px solid var(--public-border)',
        background: 'var(--public-panel)',
      }}
    >
      {/* ── Image / placeholder ─────────────────────────── */}
      <div className="relative h-52 w-full overflow-hidden">
        {cake.imgbb_url ? (
          <img
            src={cake.imgbb_url}
            alt={cake.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${placeholderGradient(cake.id)}`}
          >
            <span className="text-6xl select-none" aria-hidden="true">
              🎂
            </span>
          </div>
        )}

        {/* Bid count pill */}
        {cake.bidCount !== undefined && cake.bidCount > 0 && (
          <span
            className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow"
            style={{
              background: 'var(--public-panel-soft)',
              color: 'var(--public-accent-strong)',
            }}
          >
            {cake.bidCount} bid{cake.bidCount === 1 ? '' : 's'}
          </span>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold shadow"
            style={{
              background: 'var(--public-panel-soft)',
              color: 'var(--public-text-strong)',
            }}
          >
            #{lotNumber}
          </span>
          <button
            type="button"
            aria-label={isFavorite ? 'Remove favorite' : 'Favorite cake'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(cake.id);
            }}
            className="rounded-full bg-white/90 p-1.5 text-rose-500 shadow transition-colors hover:bg-white"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12 21-1.45-1.32C5.4 15.04 2 11.95 2 8.15 2 5.06 4.42 2.75 7.5 2.75c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.31 5.5 5.4 0 3.8-3.4 6.89-8.55 11.54Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Details ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--public-text-strong)' }}>
          #{lotNumber} {cake.name}
        </h3>

        {cake.flavor && (
          <p className="text-sm" style={{ color: 'var(--public-text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--public-text)' }}>Flavor:</span>{' '}
            {cake.flavor}
          </p>
        )}

        {cake.donor_name && (
          <p className="text-sm" style={{ color: 'var(--public-text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--public-text)' }}>Donated by:</span>{' '}
            {cake.donor_name}
          </p>
        )}

        <p className="text-sm" style={{ color: 'var(--public-text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--public-text)' }}>Leading bidder:</span>{' '}
          {cake.highest_bidder_name || 'N/A'}
        </p>

        {cake.beneficiary_kid && (
          <p className="text-sm font-medium text-rose-600">
            Supporting: {cake.beneficiary_kid}
          </p>
        )}

        {/* Current price */}
        <div className="mt-auto pt-2">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--public-text-muted)' }}>
            {isClosed
              ? 'Final Bid'
              : cake.currentBid
                ? 'Current Bid'
                : 'Starting Price'}
          </p>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--public-accent)' }}>
            ${currentPrice.toFixed(2)}
          </p>
        </div>

        {/* ── Bid buttons ───────────────────────────────── */}
        {!isClosed && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            {bidAmounts.map((amount) => (
              <button
                key={amount}
                disabled={!isLive}
                onClick={(event) => {
                  event.stopPropagation();
                  onBidClick(cake.id, amount);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isLive
                    ? 'bg-[#E8602C] text-white hover:bg-[#C74E1F] active:bg-[#A84218]'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400'
                }`}
              >
                ${amount.toFixed(2)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
