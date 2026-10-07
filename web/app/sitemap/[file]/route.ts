import { loadShardEntries } from '@/lib/sitemap-source';
import { shardIdFromFile, urlsetXml } from '@/lib/sitemap-xml';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const id = shardIdFromFile((await params).file);
  if (!id) return new Response('Not found', { status: 404 });
  const xml = urlsetXml(await loadShardEntries(id));
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
