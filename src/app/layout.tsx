import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cake Auction',
  description: 'School fundraiser cake auction - bid on delicious cakes to support student trips!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
