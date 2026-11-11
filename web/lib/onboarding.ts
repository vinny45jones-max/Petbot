// Onboarding при первом визите (§16.2, 2-3 шага).
export const ONBOARDING_COOKIE = 'onboarding-seen';
export const COOKIE_CONSENT_KEY = 'cookie-consent';
export const COOKIE_CONSENT_EVENT = 'cookie-consent-change';

export const ONBOARDING_STEPS = [
  { title: 'Найдите питомца', body: 'Каталог с фильтрами по городу, виду и срочности.' },
  { title: 'Помогите делом', body: 'Кнопка «Помочь» — пожертвование картой или через ЕРИП на конкретное животное.' },
  { title: 'Разместите объявление', body: 'Нашли животное? Заполните короткую анкету за пару минут.' },
] as const;

/** consent — значение localStorage['cookie-consent']; пока баннер висит (null), тур не показываем. */
export function shouldShowOnboarding(cookieValue: string | undefined, consent: string | null): boolean {
  return consent !== null && cookieValue !== 'seen';
}
