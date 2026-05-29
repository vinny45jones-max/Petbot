'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setShow(true);
  }, []);
  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  }
  if (!show) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 bg-card border-t p-4 z-50" role="dialog" aria-label="Cookie banner">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-3 items-start md:items-center">
        <p className="text-sm flex-1">
          Мы используем cookie для работы сайта. <Link href="/cookie-policy" className="underline">Подробнее</Link>
        </p>
        <button onClick={accept} className="px-4 py-2 bg-primary text-primary-foreground rounded">
          Принять
        </button>
      </div>
    </div>
  );
}
