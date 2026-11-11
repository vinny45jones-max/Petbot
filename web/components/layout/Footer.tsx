import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t mt-16 py-8 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 grid gap-4 md:grid-cols-4">
        <div>
          <h2 className="font-semibold mb-2">{t('aboutSection')}</h2>
          <ul className="space-y-1">
            <li><Link href="/about">{t('about')}</Link></li>
            <li><Link href="/how-it-works">{t('howItWorks')}</Link></li>
            <li><Link href="/safety">{t('safety')}</Link></li>
            <li><Link href="/success-stories">{t('successStories')}</Link></li>
            <li><Link href="/blog">{t('blog')}</Link></li>
            <li><Link href="/contacts">{t('contacts')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{t('legalSection')}</h2>
          <ul className="space-y-1">
            <li><Link href="/legal">{t('legal')}</Link></li>
            <li><Link href="/privacy">{t('privacy')}</Link></li>
            <li><Link href="/terms">{t('terms')}</Link></li>
            <li><Link href="/cookie-policy">{t('cookie')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{t('helpSection')}</h2>
          <ul className="space-y-1">
            <li><Link href="/faq">{t('faq')}</Link></li>
            <li><Link href="/help-center">{t('helpCenter')}</Link></li>
            <li><Link href="/glossary">{t('glossary')}</Link></li>
            <li><Link href="/lost-and-found">{t('lostFound')}</Link></li>
            <li><Link href="/report-cruelty">{t('reportCruelty')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{t('contactSection')}</h2>
          <p>info@pet-aggregator.by</p>
        </div>
      </div>
    </footer>
  );
}
