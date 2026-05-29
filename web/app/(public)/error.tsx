'use client';
import { Button } from '@/components/ui/button';

// Error boundary группы (public): рендерится внутри (public)/layout.tsx,
// поэтому <html>/<body>/Header/Footer уже на месте. Катастрофические ошибки
// в самом root-layout ловит app/global-error.tsx.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="max-w-6xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <p className="text-xl mb-8">Что-то пошло не так</p>
      <Button onClick={reset}>Попробовать снова</Button>
    </main>
  );
}
