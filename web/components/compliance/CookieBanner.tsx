'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

const KEY = 'cookie-consent';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

export function CookieBanner() {
  // На сервере 'ssr' — баннер скрыт до гидратации
  const consent = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY), () => 'ssr');
  const [accepted, setAccepted] = useState(false);
  function accept() {
    localStorage.setItem(KEY, 'accepted');
    setAccepted(true);
  }
  if (accepted || consent !== null) return null;
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
