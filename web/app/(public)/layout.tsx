import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import PlausibleProvider from 'next-plausible';
import { NextIntlClientProvider } from 'next-intl';
import { FONT_SCALE_INIT_SCRIPT } from '@/lib/a11y/font-scale';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CookieBanner } from '@/components/compliance/CookieBanner';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

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
    <html lang="ru-BY" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FONT_SCALE_INIT_SCRIPT }} />
        <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'pet-aggregator.by'} trackOutboundLinks />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <CookieBanner />
          <OnboardingTour />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
