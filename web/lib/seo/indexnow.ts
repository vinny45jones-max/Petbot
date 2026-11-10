// Пинг IndexNow (Яндекс/Bing): мгновенная переиндексация URL. §16.7.

export interface IndexNowBody {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/** Тело запроса IndexNow; null — пинговать нечего/нечем (нет ключа, локальный хост, пустой список). */
export function buildIndexNowBody(baseUrl: string | undefined, key: string | undefined, urls: string[]): IndexNowBody | null {
  if (!key || !baseUrl || !urls.length) return null;
  const base = baseUrl.replace(/\/$/, '');
  const { host, hostname } = new URL(base);
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  return {
    host,
    key,
    // ключ отдаёт роут /indexnow-key из env — статичный файл в public/ потребовал бы коммитить ключ
    keyLocation: `${base}/indexnow-key`,
    urlList: urls.map((u) => (/^https?:\/\//.test(u) ? u : `${base}${u}`)),
  };
}

/** Никогда не бросает — SEO не должен ломать публикацию. */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const body = buildIndexNowBody(process.env.NEXT_PUBLIC_APP_URL, process.env.INDEXNOW_KEY, urls);
  if (!body) return;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error('[indexnow] ping rejected', res.status);
  } catch (e) {
    console.error('[indexnow] ping failed', e);
  }
}
