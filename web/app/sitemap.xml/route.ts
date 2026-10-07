import { loadShards, SITEMAP_BASE } from '@/lib/sitemap-source';
import { sitemapIndexXml } from '@/lib/sitemap-xml';

// Не на build: при сборке на Railway приватная сеть (postgres.railway.internal) недоступна
export const dynamic = 'force-dynamic';

export async function GET() {
  const xml = sitemapIndexXml(SITEMAP_BASE, await loadShards());
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
