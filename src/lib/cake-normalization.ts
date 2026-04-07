type CakeLike = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeCake<T extends CakeLike>(cake: T): T {
  return {
    ...cake,
    starting_price: toNumber(cake.starting_price),
    min_increment: toNumber(cake.min_increment),
    max_increment: toNumber(cake.max_increment),
    bid_count: cake.bid_count == null ? cake.bid_count : toNumber(cake.bid_count),
    highest_bid:
      cake.highest_bid == null ? cake.highest_bid : toNumber(cake.highest_bid),
    final_amount_paid:
      cake.final_amount_paid == null ? cake.final_amount_paid : toNumber(cake.final_amount_paid),
  };
}

export function normalizeCakes<T extends CakeLike>(cakes: T[]): T[] {
  return cakes.map(normalizeCake);
}
