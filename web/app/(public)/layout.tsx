import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import PlausibleProvider from 'next-plausible';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CookieBanner } from '@/components/compliance/CookieBanner';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: { default: 'Pet Aggregator BY — найди питомца', template: '%s | Pet Aggregator BY' },
  description:
    'Общенациональный белорусский агрегатор животных для пристройства, помощи приютам и юридической помощи.',
};

// Root layout группы (public): своя <html>/<body>. Admin живёт в отдельном
// root-layout (payload)/layout.tsx с собственным <html> (Payload RootLayout),
// поэтому общего app/layout.tsx нет — паттерн multiple root layouts.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru-BY">
      <head>
        <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'pet-aggregator.by'} trackOutboundLinks />
      </head>
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
