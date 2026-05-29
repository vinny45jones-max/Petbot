export const metadata = { title: 'Политика использования cookie' };

export default function CookiePolicyPage() {
  return (
    <article className="prose max-w-3xl mx-auto px-4 py-12">
      <h1>Политика использования cookie</h1>
      <p><strong>Дата вступления в силу:</strong> {new Date().toLocaleDateString('ru-BY')}</p>
      <p>Pet Aggregator BY использует cookie для работы сайта и анонимной аналитики. Финальный текст готовит юрист-партнёр в фазе 0.</p>
      <h2>1. Какие cookie мы используем</h2>
      <p>[ЗАГЛУШКА — технические cookie сессии + аналитика Plausible без персональных данных]</p>
      <h2>2. Как отключить cookie</h2>
      <p>[ЗАГЛУШКА — настройки браузера]</p>
      <h2>3. Контакты</h2>
      <p>info@pet-aggregator.by</p>
    </article>
  );
}
