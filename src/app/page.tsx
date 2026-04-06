import Link from 'next/link';
import { getDb } from '@/lib/db';
import { enrichAuctionWithStatus } from '@/lib/auction-status';
import { Badge } from '@/components/ui/Badge';
import type { Auction, AuctionWithStatus } from '@/types';

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
      className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-xl font-semibold text-[#1B3C6D]">
              {auction.title}
            </h2>
            <Badge variant={auction.effectiveStatus}>
              {auction.effectiveStatus === 'closed'
                ? 'past'
                : auction.effectiveStatus}
            </Badge>
          </div>

          {auction.description && (
            <p className="mt-2 text-sm text-gray-600">{auction.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-500 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-gray-700">Preview</dt>
              <dd>{formatDate(auction.preview_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Live</dt>
              <dd>{formatDate(auction.live_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Close</dt>
              <dd>{formatDate(auction.close_at)}</dd>
            </div>
          </dl>
        </div>

        <span className="shrink-0 text-sm font-semibold text-[#E8602C]">
          {cta}
        </span>
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#eff6ff)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mb-4 text-5xl">Cake Auction</div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1B3C6D] sm:text-5xl">
            School Cake Auctions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
            Preview upcoming auctions, bid when they go live, and browse past
            auction results.
          </p>
        </div>

        {!hasAuctions && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-8 py-16 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">
              Bookmark this page.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Preview, live, and past auctions will show up here as they become
              available.
            </p>
          </div>
        )}

        {liveAuctions.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">Live Auctions</h2>
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
              <h2 className="text-2xl font-semibold text-gray-900">Preview Auctions</h2>
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
              <h2 className="text-2xl font-semibold text-gray-900">Past Auctions</h2>
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

      <Link
        href="/admin"
        aria-label="Open admin"
        title="Admin"
        className="fixed bottom-5 right-5 h-4 w-4 rounded-full bg-[#1B3C6D]/80 shadow-[0_0_0_6px_rgba(255,255,255,0.75)] transition-all hover:scale-110 hover:bg-[#E8602C]"
      />
    </main>
  );
}
