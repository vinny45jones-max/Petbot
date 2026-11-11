// Масштаб базового шрифта («Шрифт крупнее», §16.2). Выбор хранится в cookie на год.
export const FONT_SCALES = ['normal', 'large', 'xlarge'] as const;
export type FontScale = (typeof FONT_SCALES)[number];
export const FONT_SCALE_COOKIE = 'font-scale';

export function isFontScale(v: unknown): v is FontScale {
  return typeof v === 'string' && (FONT_SCALES as readonly string[]).includes(v);
}

export function nextFontScale(current: unknown): FontScale {
  const cur: FontScale = isFontScale(current) ? current : 'normal';
  return FONT_SCALES[(FONT_SCALES.indexOf(cur) + 1) % FONT_SCALES.length];
}

// Блокирующий скрипт в <head>: ставит атрибут до первой отрисовки, без мигания
// и без cookies() в layout (иначе все статические страницы стали бы динамическими).
export const FONT_SCALE_INIT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${FONT_SCALE_COOKIE}=([^;]*)/);var v=m&&m[1];if(${JSON.stringify(
  FONT_SCALES.filter((s) => s !== 'normal'),
)}.indexOf(v)>-1)document.documentElement.setAttribute('data-font-scale',v)}catch(e){}`;
