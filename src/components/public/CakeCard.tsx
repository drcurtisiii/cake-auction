'use client';

import React from 'react';
import type { Cake, EffectiveAuctionStatus } from '@/types';
import { generateBidAmounts } from '@/lib/bid-buttons';

interface CakeCardProps {
  cake: Cake & { currentBid?: number; bidCount?: number };
  auctionStatus: EffectiveAuctionStatus;
  onBidClick: (cakeId: string, amount: number) => void;
  onOpenDetails: (cake: Cake & { currentBid?: number; bidCount?: number }) => void;
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
  auctionStatus,
  onBidClick,
  onOpenDetails,
}) => {
  const currentPrice = cake.currentBid ?? cake.starting_price;
  const bidAmounts = generateBidAmounts(
    currentPrice,
    cake.min_increment,
    cake.max_increment,
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
      </div>

      {/* ── Details ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--public-text-strong)' }}>
          {cake.name}
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

        {cake.highest_bidder_name && (
          <p className="text-sm" style={{ color: 'var(--public-text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--public-text)' }}>Leading bidder:</span>{' '}
            {cake.highest_bidder_name}
          </p>
        )}

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
          <div className="mt-2 grid grid-cols-2 gap-2">
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
