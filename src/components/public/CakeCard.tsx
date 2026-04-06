'use client';

import React from 'react';
import type { Cake, EffectiveAuctionStatus } from '@/types';
import { generateBidAmounts } from '@/lib/bid-buttons';

interface CakeCardProps {
  cake: Cake & { currentBid?: number; bidCount?: number };
  auctionStatus: EffectiveAuctionStatus;
  onBidClick: (cakeId: string, amount: number) => void;
}

/** Random warm background for the placeholder when there is no image */
const placeholderColors = [
  'from-rose-400 to-amber-300',
  'from-indigo-400 to-pink-300',
  'from-amber-400 to-rose-300',
  'from-pink-400 to-indigo-300',
  'from-fuchsia-400 to-amber-300',
  'from-violet-400 to-rose-300',
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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
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
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 shadow">
            {cake.bidCount} bid{cake.bidCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ── Details ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold text-gray-900">{cake.name}</h3>

        {cake.flavor && (
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-600">Flavor:</span>{' '}
            {cake.flavor}
          </p>
        )}

        {cake.donor_name && (
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-600">Donated by:</span>{' '}
            {cake.donor_name}
          </p>
        )}

        {cake.beneficiary_kid && (
          <p className="text-sm font-medium text-rose-600">
            Supporting: {cake.beneficiary_kid}
          </p>
        )}

        {/* Current price */}
        <div className="mt-auto pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {isClosed
              ? 'Final Bid'
              : cake.currentBid
                ? 'Current Bid'
                : 'Starting Price'}
          </p>
          <p className="text-2xl font-extrabold text-indigo-600">
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
                onClick={() => onBidClick(cake.id, amount)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isLive
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
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
