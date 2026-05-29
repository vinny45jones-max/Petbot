import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: { default: 'Pet Aggregator BY — найди питомца', template: '%s | Pet Aggregator BY' },
  description: 'Общенациональный белорусский агрегатор животных для пристройства, помощи приютам и юридической помощи.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru-BY">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
