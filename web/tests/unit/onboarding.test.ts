import { describe, it, expect } from 'vitest';
import { ONBOARDING_COOKIE, ONBOARDING_STEPS, shouldShowOnboarding } from '@/lib/onboarding';

describe('onboarding', () => {
  it('показываем при первом визите после ответа на cookie-баннер', () => {
    expect(shouldShowOnboarding(undefined, 'accepted')).toBe(true);
    expect(shouldShowOnboarding('', 'accepted')).toBe(true);
  });
  it('не показываем после "seen"', () => {
    expect(shouldShowOnboarding('seen', 'accepted')).toBe(false);
  });
  it('не показываем, пока висит cookie-баннер (не перекрываем его)', () => {
    expect(shouldShowOnboarding(undefined, null)).toBe(false);
  });
  it('2-3 шага', () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(2);
    expect(ONBOARDING_STEPS.length).toBeLessThanOrEqual(3);
    expect(ONBOARDING_COOKIE).toBe('onboarding-seen');
  });
});
