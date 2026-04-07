import { getDb } from '@/lib/db';

export const DEFAULT_RULES: string[] = [
  'All sales are final - no refunds on winning bids',
  'Winning bidders must pick up their cakes at the designated time and location',
  'Payment is due at time of pickup',
  'Bidding closes at the posted end time - no exceptions',
  'In case of a tie, the earlier bid wins',
  'Minimum bid increments must be respected',
  'If pickup is not completed by the end of the pickup window, the auctioneer may call down the bidder list and offer the cake at each bidder\'s last bid amount.',
  'Have fun and bid generously - it\'s all for a great cause!',
];

export async function getDefaultRules(): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT rule_text
    FROM default_rules
    ORDER BY sort_order ASC, created_at ASC
  `.catch(() => []);

  if (!rows.length) {
    return DEFAULT_RULES;
  }

  return rows.map((row) => String(row.rule_text));
}

export async function saveDefaultRules(ruleTexts: string[]): Promise<void> {
  const sql = getDb();
  const normalizedRules = ruleTexts
    .map((rule) => rule.trim())
    .filter(Boolean);

  if (normalizedRules.length === 0) {
    throw new Error('At least one rule is required');
  }

  await sql`DELETE FROM default_rules`;

  for (let i = 0; i < normalizedRules.length; i++) {
    await sql`
      INSERT INTO default_rules (rule_text, sort_order)
      VALUES (${normalizedRules[i]}, ${i})
    `;
  }
}

export async function seedDefaultRules(auctionId: string): Promise<void> {
  const sql = getDb();
  const defaultRules = await getDefaultRules();

  for (let i = 0; i < defaultRules.length; i++) {
    await sql`
      INSERT INTO rules (auction_id, rule_text, sort_order)
      VALUES (${auctionId}, ${defaultRules[i]}, ${i})
    `;
  }
}
