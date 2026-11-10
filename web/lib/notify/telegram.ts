/**
 * Шлёт сообщение в админ-канал/чат проекта через Telegram Bot API.
 * Тихо логирует и не бросает, если конфиг отсутствует (уведомления не критичны для основного flow).
 */
export async function notifyAdminChannel(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[notify] TELEGRAM_BOT_TOKEN/TELEGRAM_NOTIFY_CHAT_ID not set, skipping');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('[notify] telegram sendMessage failed', res.status);
  } catch (e) {
    console.error('[notify] telegram error', e);
  }
}

/** Автопост §17.6 в публичный канал проекта о срочном животном. Тихо пропускает без конфигурации. */
export async function notifyUrgentChannel(text: string, photoUrl?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_URGENT_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[notify] TELEGRAM_BOT_TOKEN/TELEGRAM_URGENT_CHAT_ID not set, skipping urgent autopost');
    return;
  }
  const send = (method: string, body: Record<string, unknown>) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, ...body }),
    });
  try {
    let res = photoUrl ? await send('sendPhoto', { photo: photoUrl, caption: text }) : await send('sendMessage', { text });
    // Telegram не смог скачать фото (локальный/закрытый URL) — пост без фото важнее, чем никакого
    if (!res.ok && photoUrl) res = await send('sendMessage', { text });
    if (!res.ok) console.error('[notify] urgent post failed', res.status);
  } catch (e) {
    console.error('[notify] urgent post error', e);
  }
}
