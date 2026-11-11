import { describe, it, expect } from 'vitest';
import { shouldLoadTawk, tawkSrc } from '@/lib/support/tawk';

describe('tawk', () => {
  it('грузим только при согласии + заданных env', () => {
    expect(shouldLoadTawk(true, { propertyId: 'p1', widgetId: 'w1' })).toBe(true);
  });
  it('без согласия — не грузим (cookie-banner ещё не принят)', () => {
    expect(shouldLoadTawk(false, { propertyId: 'p1', widgetId: 'w1' })).toBe(false);
  });
  it('без env — не грузим', () => {
    expect(shouldLoadTawk(true, { propertyId: '', widgetId: '' })).toBe(false);
    expect(shouldLoadTawk(true, { propertyId: 'p1', widgetId: '' })).toBe(false);
  });
  it('tawkSrc строит корректный URL и экранирует сегменты', () => {
    expect(tawkSrc('PROP', 'WID')).toBe('https://embed.tawk.to/PROP/WID');
    expect(tawkSrc('a/b', 'c?d')).toBe('https://embed.tawk.to/a%2Fb/c%3Fd');
  });
});
