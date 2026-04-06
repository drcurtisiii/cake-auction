import type { Metadata } from 'next';
import './globals.css';
import { PublicChrome } from '@/components/public/PublicChrome';

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cake-auction-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`,
          }}
        />
        <PublicChrome />
        {children}
      </body>
    </html>
  );
}
