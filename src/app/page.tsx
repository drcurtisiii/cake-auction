import Link from 'next/link';
import { getDb } from '@/lib/db';
import { enrichAuctionWithStatus } from '@/lib/auction-status';
import { formatInAppTimeZone } from '@/lib/timezone';
import { Badge } from '@/components/ui/Badge';
import type { Auction, AuctionWithStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(dateStr: string | null | undefined): string {
  return formatInAppTimeZone(dateStr);
}

function AuctionCard({
  auction,
  href,
  cta,
  showSubmitCake = false,
}: {
  auction: AuctionWithStatus;
  href: string;
  cta: string;
  showSubmitCake?: boolean;
}) {
  const submissionUrl = `/cakeregistration?auction=${auction.id}`;

  return (
    <div
      className="overflow-hidden rounded-2xl p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: 'var(--public-panel)',
        border: '1px solid var(--public-border)',
      }}
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div className="sm:w-24 sm:shrink-0">
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: 'var(--public-panel-soft)' }}
          >
            {auction.imgbb_url ? (
              <img
                src={auction.imgbb_url}
                alt={auction.title}
                className="h-40 w-full object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div
                className="flex h-40 w-full items-center justify-center text-4xl sm:h-24 sm:w-24 sm:text-2xl"
                style={{ color: 'var(--public-text-muted)' }}
              >
                Cake
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-xl font-semibold"
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

        <div className="flex shrink-0 flex-col gap-2 sm:w-40">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--public-accent)' }}
          >
            {cta}
          </Link>
          {showSubmitCake && (
            <Link
              href={submissionUrl}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: 'var(--public-border)',
                background: 'var(--public-panel)',
                color: 'var(--public-text)',
              }}
            >
              Submit Cake
            </Link>
          )}
        </div>
      </div>
    </div>
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
                  showSubmitCake
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
