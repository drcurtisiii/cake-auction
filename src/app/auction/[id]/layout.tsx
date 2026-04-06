import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cake Auction',
  description: 'Bid on delicious cakes and support a great cause!',
};

export default function AuctionPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--public-surface-bg)',
      }}
    >
      {/* Header */}
      <header
        style={{
          textAlign: 'center',
          padding: '1.25rem 1rem',
          borderBottom: '1px solid var(--public-border)',
          background: 'var(--public-panel-soft)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--public-text)',
            fontFamily:
              "'Georgia', 'Times New Roman', serif",
          }}
        >
          <span role="img" aria-label="cake">
            🎂
          </span>{' '}
          Cake Auction
        </h1>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '48rem',
          margin: '0 auto',
          padding: '1.5rem 1rem',
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.25rem 1rem',
          borderTop: '1px solid var(--public-border)',
          background: 'var(--public-panel-soft)',
          color: 'var(--public-text)',
          fontSize: '0.85rem',
        }}
      >
        Made with <span style={{ color: '#e53935' }}>&#10084;</span> for our
        school community
      </footer>
    </div>
  );
}
