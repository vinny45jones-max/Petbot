import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t mt-16 py-8 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 grid gap-4 md:grid-cols-4">
        <div>
          <h3 className="font-semibold mb-2">О проекте</h3>
          <ul className="space-y-1">
            <li><Link href="/about">О нас</Link></li>
            <li><Link href="/contacts">Контакты</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Юридическое</h3>
          <ul className="space-y-1">
            <li><Link href="/privacy">Политика конфиденциальности</Link></li>
            <li><Link href="/terms">Условия использования</Link></li>
            <li><Link href="/cookie-policy">Cookie</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Помощь</h3>
          <ul className="space-y-1">
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/report-cruelty">Сообщить о жестокости</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Связь</h3>
          <p>info@pet-aggregator.by</p>
        </div>
      </div>
    </footer>
  );
}
