'use client';
import { useEffect, useRef } from 'react';

interface Props {
  botUsername: string;
  redirectUrl?: string;
}

export function TelegramLoginButton({ botUsername, redirectUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    ref.current.appendChild(script);
    (window as any).onTelegramAuth = async (user: any) => {
      const r = await fetch('/api/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (r.ok) {
        window.location.href = redirectUrl || '/me';
      }
    };
  }, [botUsername, redirectUrl]);

  return <div ref={ref} />;
}
