import Link from 'next/link';
import { getDb } from '@/lib/db';
import { enrichAuctionWithStatus } from '@/lib/auction-status';
import { Badge } from '@/components/ui/Badge';
import type { Auction, AuctionWithStatus } from '@/types';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';

  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AuctionCard({
  auction,
  href,
  cta,
}: {
  auction: AuctionWithStatus;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-2xl p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: 'var(--public-panel)',
        border: '1px solid var(--public-border)',
      }}
    >
      {auction.imgbb_url && (
        <div className="h-44 w-full overflow-hidden">
          <img
            src={auction.imgbb_url}
            alt={auction.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="truncate text-xl font-semibold"
              style={{ color: 'var(--public-text)' }}
            >
              {auction.title}
            </h2>
            <Badge variant={auction.effectiveStatus}>
              {auction.effectiveStatus === 'closed'
                ? 'past'
                : auction.effectiveStatus}
            </Badge>
          </div>

          {auction.description && (
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--public-text-muted)' }}
            >
              {auction.description}
            </p>
          )}

          <dl
            className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3"
            style={{ color: 'var(--public-text-muted)' }}
          >
            <div>
              <dt className="font-medium" style={{ color: 'var(--public-text)' }}>
                Preview
              </dt>
              <dd>{formatDate(auction.preview_at)}</dd>
            </div>
            <div>
              <dt className="font-medium" style={{ color: 'var(--public-text)' }}>
                Live
              </dt>
              <dd>{formatDate(auction.live_at)}</dd>
            </div>
            <div>
              <dt className="font-medium" style={{ color: 'var(--public-text)' }}>
                Close
              </dt>
              <dd>{formatDate(auction.close_at)}</dd>
            </div>
          </dl>
        </div>

        <span
          className="shrink-0 text-sm font-semibold"
          style={{ color: 'var(--public-accent)' }}
        >
          {cta}
        </span>
      </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM auctions
    WHERE status = 'published'
    ORDER BY created_at DESC
  `;

  const auctions = (rows as Auction[]).map((row) => enrichAuctionWithStatus(row));

  const liveAuctions = auctions
    .filter((auction) => auction.effectiveStatus === 'live')
    .sort(
      (a, b) =>
        new Date(a.live_at ?? 0).getTime() - new Date(b.live_at ?? 0).getTime(),
    );

  const previewAuctions = auctions
    .filter((auction) => auction.effectiveStatus === 'preview')
    .sort(
      (a, b) =>
        new Date(a.preview_at ?? a.live_at ?? 0).getTime() -
        new Date(b.preview_at ?? b.live_at ?? 0).getTime(),
    );

  const pastAuctions = auctions
    .filter((auction) => auction.effectiveStatus === 'closed')
    .sort(
      (a, b) =>
        new Date(b.close_at ?? 0).getTime() - new Date(a.close_at ?? 0).getTime(),
    );

  const hasAuctions =
    liveAuctions.length > 0 ||
    previewAuctions.length > 0 ||
    pastAuctions.length > 0;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6" style={{ background: 'var(--public-page-bg)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mb-4 text-5xl" style={{ color: 'var(--public-text)' }}>Cake Auction</div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--public-text)' }}>
            School Cake Auctions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg" style={{ color: 'var(--public-text-muted)' }}>
            Preview upcoming auctions, bid when they go live, and browse past
            auction results.
          </p>
        </div>

        {!hasAuctions && (
          <div
            className="rounded-3xl border border-dashed px-8 py-16 text-center shadow-sm"
            style={{
              borderColor: 'var(--public-border)',
              background: 'var(--public-panel-soft)',
            }}
          >
            <p className="text-lg font-medium" style={{ color: 'var(--public-text)' }}>
              Bookmark this page.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--public-text-muted)' }}>
              Preview, live, and past auctions will show up here as they become
              available.
            </p>
          </div>
        )}

        {liveAuctions.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--public-text-strong)' }}>Live Auctions</h2>
              <Badge variant="live">happening now</Badge>
            </div>
            <div className="space-y-4">
              {liveAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  href={`/auction/${auction.id}`}
                  cta="Open Auction"
                />
              ))}
            </div>
          </section>
        )}

        {previewAuctions.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--public-text-strong)' }}>Preview Auctions</h2>
              <Badge variant="preview">coming soon</Badge>
            </div>
            <div className="space-y-4">
              {previewAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  href={`/auction/${auction.id}`}
                  cta="Preview Auction"
                />
              ))}
            </div>
          </section>
        )}

        {pastAuctions.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--public-text-strong)' }}>Past Auctions</h2>
              <Badge variant="closed">results</Badge>
            </div>
            <div className="space-y-4">
              {pastAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  href={`/auction/${auction.id}/results`}
                  cta="View Results"
                />
              ))}
            </div>
          </section>
        )}
      </div>

    </main>
  );
}
