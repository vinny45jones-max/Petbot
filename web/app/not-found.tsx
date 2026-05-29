import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      {/* Header/Footer repeated intentionally: not-found renders outside the (public) route-group layout in Next.js */}
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Страница не найдена</p>
        <Link href="/" className={buttonVariants()}>На главную</Link>
      </main>
      <Footer />
    </>
  );
}
