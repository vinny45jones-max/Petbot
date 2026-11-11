'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { nextFontScale, FONT_SCALE_COOKIE } from '@/lib/a11y/font-scale';

// Текущий масштаб живёт в атрибуте <html> (его ставит FONT_SCALE_INIT_SCRIPT). State — только текст
// для экранных читалок: после нажатия объявляется новый размер (до нажатия пусто — без расхождения с SSR).
export function FontSizeToggle() {
  const t = useTranslations('footer');
  const [announce, setAnnounce] = useState('');

  function cycle() {
    const root = document.documentElement;
    const next = nextFontScale(root.getAttribute('data-font-scale'));
    if (next === 'normal') root.removeAttribute('data-font-scale');
    else root.setAttribute('data-font-scale', next);
    document.cookie = `${FONT_SCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setAnnounce(t(`fontScale.${next}`));
  }

  return (
    <>
      <button type="button" onClick={cycle} data-testid="font-size-toggle"
        className="inline-flex items-center gap-1 underline underline-offset-2">
        <span aria-hidden>A+</span> {t('fontLarger')}
      </button>
      <span role="status" className="sr-only" data-testid="font-size-status">{announce}</span>
    </>
  );
}
