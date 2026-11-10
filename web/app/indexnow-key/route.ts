export const dynamic = 'force-dynamic';

/** Верификация владения для IndexNow (§16.7): отдаёт ключ из env как text/plain. */
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
