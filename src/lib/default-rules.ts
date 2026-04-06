import { getDb } from '@/lib/db';

export const DEFAULT_RULES: string[] = [
  'All sales are final - no refunds on winning bids',
  'Winning bidders must pick up their cakes at the designated time and location',
  'Payment is due at time of pickup',
  'Bidding closes at the posted end time - no exceptions',
  'In case of a tie, the earlier bid wins',
  'Minimum bid increments must be respected',
  'Have fun and bid generously - it\'s all for a great cause!',
];

export async function seedDefaultRules(auctionId: string): Promise<void> {
  const sql = getDb();

  for (let i = 0; i < DEFAULT_RULES.length; i++) {
    await sql`
      INSERT INTO rules (auction_id, rule_text, sort_order)
      VALUES (${auctionId}, ${DEFAULT_RULES[i]}, ${i})
    `;
  }
}
