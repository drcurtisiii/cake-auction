export function generateBidAmounts(
  currentPrice: number,
  minIncrement: number,
): number[] {
  return [currentPrice + minIncrement];
}
