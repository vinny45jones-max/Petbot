'use client';
import { useTranslations } from 'next-intl';
import { nextFontScale, FONT_SCALE_COOKIE } from '@/lib/a11y/font-scale';

// Текущий масштаб живёт в атрибуте <html> (его ставит FONT_SCALE_INIT_SCRIPT) — отдельный state не нужен.
export function FontSizeToggle() {
  const t = useTranslations('footer');

  function cycle() {
    const root = document.documentElement;
    const next = nextFontScale(root.getAttribute('data-font-scale'));
    if (next === 'normal') root.removeAttribute('data-font-scale');
    else root.setAttribute('data-font-scale', next);
    document.cookie = `${FONT_SCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button type="button" onClick={cycle} data-testid="font-size-toggle"
      className="inline-flex items-center gap-1 underline underline-offset-2">
      <span aria-hidden>A+</span> {t('fontLarger')}
    </button>
  );
}
