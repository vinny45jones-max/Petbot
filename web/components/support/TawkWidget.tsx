'use client';
import { useEffect } from 'react';
import { shouldLoadTawk, tawkSrc } from '@/lib/support/tawk';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY } from '@/lib/onboarding';

const env = {
  propertyId: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? '',
  widgetId: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? '',
};

export function TawkWidget() {
  useEffect(() => {
    const load = () => {
      if (!shouldLoadTawk(localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted', env)) return;
      if (document.getElementById('tawk-script')) return;
      const s = document.createElement('script');
      s.id = 'tawk-script';
      s.async = true;
      s.src = tawkSrc(env.propertyId, env.widgetId);
      s.charset = 'UTF-8';
      s.setAttribute('crossorigin', '*');
      document.body.appendChild(s);
    };
    load();
    window.addEventListener(COOKIE_CONSENT_EVENT, load);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, load);
  }, []);
  return null;
}
