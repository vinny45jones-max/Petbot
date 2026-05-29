/* eslint-disable @next/next/no-html-link-for-pages -- ссылка ведёт на API-роут экспорта (скачивание JSON), не на страницу */
export const metadata = { title: 'Политика конфиденциальности' };

export default function PrivacyPage() {
  return (
    <article className="prose max-w-3xl mx-auto px-4 py-12">
      <h1>Политика конфиденциальности</h1>
      <p><strong>Дата вступления в силу:</strong> {new Date().toLocaleDateString('ru-BY')}</p>
      <p>Pet Aggregator BY обрабатывает персональные данные в соответствии с Законом Республики Беларусь от 7 мая 2021 г. № 99-З «О защите персональных данных» и Указом Президента Республики Беларусь от 28 октября 2021 г. № 422.</p>
      <h2>1. Какие данные мы собираем</h2>
      <p>[ЗАГЛУШКА — заполняется юристом-партнёром в фазе 0]</p>
      <h2>2. Цели обработки</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>3. Сроки хранения</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>4. Ваши права</h2>
      <ul>
        <li>Получить копию данных — <a href="/api/account/export">скачать JSON</a></li>
        <li>Удалить аккаунт — в личном кабинете</li>
        <li>Обратиться к нам — info@pet-aggregator.by</li>
      </ul>
    </article>
  );
}
