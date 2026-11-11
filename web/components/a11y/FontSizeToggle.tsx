'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type FontScale, nextFontScale, isFontScale, FONT_SCALE_COOKIE } from '@/lib/a11y/font-scale';

export function FontSizeToggle() {
  const t = useTranslations('footer');
  const [scale, setScale] = useState<FontScale>('normal');

  useEffect(() => {
    const v = document.documentElement.getAttribute('data-font-scale');
    if (isFontScale(v)) setScale(v);
  }, []);

  function cycle() {
    const next = nextFontScale(scale);
    setScale(next);
    if (next === 'normal') document.documentElement.removeAttribute('data-font-scale');
    else document.documentElement.setAttribute('data-font-scale', next);
    document.cookie = `${FONT_SCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={cycle}
      data-testid="font-size-toggle"
      data-scale={scale}
      className="inline-flex items-center gap-1 underline underline-offset-2"
    >
      <span aria-hidden>A+</span> {t('fontLarger')}
    </button>
  );
}
