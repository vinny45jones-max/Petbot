import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import '../globals.css';
import PlausibleProvider from 'next-plausible';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CookieBanner } from '@/components/compliance/CookieBanner';
import { requireUser } from '@/lib/auth/current-user';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Личный кабинет | Pet Aggregator BY',
  robots: { index: false, follow: false }, // приватная зона — не индексировать
};

export const dynamic = 'force-dynamic';

// Root layout группы (account): своя <html>/<body> (общего app/layout.tsx нет —
// паттерн multiple root layouts, см. (public)/(payload)). Guard requireUser
// защищает все /me/* — без сессии редирект на /login.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <html lang="ru-BY">
      <head>
        <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'pet-aggregator.by'} trackOutboundLinks />
      </head>
      <body className={inter.className}>
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-6">
          <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
            <Link href="/me" className="font-medium">Кабинет</Link>
            <Link href="/me/animals">Мои животные</Link>
            <Link href="/me/inquiries">Мои заявки</Link>
          </nav>
          {children}
        </div>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
