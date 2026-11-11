import { describe, it, expect, vi } from 'vitest';
import { FONT_SCALES, nextFontScale, isFontScale, FONT_SCALE_INIT_SCRIPT } from '@/lib/a11y/font-scale';

describe('font-scale', () => {
  it('циклически переключает масштаб', () => {
    expect(nextFontScale('normal')).toBe('large');
    expect(nextFontScale('large')).toBe('xlarge');
    expect(nextFontScale('xlarge')).toBe('normal');
  });
  it('невалидный вход трактуется как normal', () => {
    expect(nextFontScale('bogus')).toBe('large');
  });
  it('isFontScale валидирует значение cookie', () => {
    expect(isFontScale('large')).toBe(true);
    expect(isFontScale('huge')).toBe(false);
  });
  it('FONT_SCALES = три значения', () => {
    expect(FONT_SCALES).toEqual(['normal', 'large', 'xlarge']);
  });
});

describe('FONT_SCALE_INIT_SCRIPT', () => {
  function run(cookie: string) {
    const setAttribute = vi.fn();
    const document = { cookie, documentElement: { setAttribute } };
    new Function('document', FONT_SCALE_INIT_SCRIPT)(document);
    return setAttribute;
  }
  it('ставит атрибут из валидной cookie', () => {
    expect(run('a=1; font-scale=xlarge; b=2')).toHaveBeenCalledWith('data-font-scale', 'xlarge');
  });
  it('игнорирует невалидное значение и отсутствие cookie', () => {
    expect(run('font-scale=<script>')).not.toHaveBeenCalled();
    expect(run('')).not.toHaveBeenCalled();
  });
});
