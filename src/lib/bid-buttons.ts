/**
 * Generates preset bid amounts evenly spaced between
 * currentPrice + minIncrement and currentPrice + maxIncrement.
 *
 * Always includes the min and max endpoints, with two evenly
 * spaced values in between (4 total).
 */
export function generateBidAmounts(
  currentPrice: number,
  minIncrement: number,
  maxIncrement: number,
): number[] {
  const low = currentPrice + minIncrement;
  const high = currentPrice + maxIncrement;

  // If the range is too small to fit 4 distinct values, collapse gracefully
  if (high <= low) {
    return [low];
  }

  const step = (high - low) / 3;

  const amounts = [
    low,
    Math.round(low + step),
    Math.round(low + step * 2),
    high,
  ];

  // Deduplicate (can happen with very small ranges)
  return [...new Set(amounts)];
}
