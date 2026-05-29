export const metadata = { title: 'Пользовательское соглашение' };

export default function TermsPage() {
  return (
    <article className="prose max-w-3xl mx-auto px-4 py-12">
      <h1>Пользовательское соглашение</h1>
      <p><strong>Дата вступления в силу:</strong> {new Date().toLocaleDateString('ru-BY')}</p>
      <p>Используя Pet Aggregator BY, вы соглашаетесь с настоящими условиями. Финальный текст готовит юрист-партнёр в фазе 0.</p>
      <h2>1. Предмет соглашения</h2>
      <p>[ЗАГЛУШКА — заполняется юристом-партнёром в фазе 0]</p>
      <h2>2. Права и обязанности пользователя</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>3. Ответственность сторон</h2>
      <p>[ЗАГЛУШКА]</p>
      <h2>4. Контакты</h2>
      <p>info@pet-aggregator.by</p>
    </article>
  );
}
