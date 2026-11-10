'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void };
  }
}

/** Токен из скрытого input виджета — для форм, отправляющих JSON или server action, а не FormData. */
export function readTurnstileToken(): string {
  return document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? '';
}

/** Рендерит Turnstile-виджет и кладёт токен в скрытый input name="cf-turnstile-response". */
export function TurnstileWidget() {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const id = 'cf-turnstile-script';
    const onLoad = () => {
      if (window.turnstile && ref.current) {
        window.turnstile.render(ref.current, { sitekey: siteKey });
      }
    };
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.addEventListener('load', onLoad);
      document.head.appendChild(script);
    } else {
      onLoad();
    }
  }, [siteKey]);

  if (!siteKey) return null; // в dev без ключа виджет не нужен
  return <div ref={ref} className="my-3" />;
}
