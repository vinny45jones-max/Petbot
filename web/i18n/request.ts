import { getRequestConfig } from 'next-intl/server';

// Одна локаль на MVP, без i18n-routing. be/en — заполнением словарей в фазе 2-3 (§10.12).
export default getRequestConfig(async () => {
  const locale = 'ru';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
