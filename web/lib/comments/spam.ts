export interface SpamInput {
  body: string;
  recentByAuthor: string[]; // тексты недавних комментов автора (за окно времени)
}
export interface SpamResult {
  score: number;       // 0..100
  shadowBan: boolean;  // >= 50 → скрыть незаметно
  reasons: string[];
}

const LINK_RE = /https?:\/\/|www\.|t\.me\//gi;

export function scoreCommentSpam(input: SpamInput): SpamResult {
  const reasons: string[] = [];
  let score = 0;
  const body = input.body.trim();

  const links = (body.match(LINK_RE) ?? []).length;
  if (links >= 1) { score += 25 * links; reasons.push(`links:${links}`); }

  const letters = body.replace(/[^a-zа-яё]/gi, '').length;
  const caps = body.replace(/[^A-ZА-ЯЁ]/g, '').length;
  if (letters > 10 && caps / letters > 0.6) { score += 20; reasons.push('caps'); }

  if (input.recentByAuthor.some((t) => t.trim().toLowerCase() === body.toLowerCase())) {
    score += 60; reasons.push('duplicate');
  }

  // серия сама по себе — уже shadow-ban (порог 50)
  if (input.recentByAuthor.length >= 5) { score += 50; reasons.push('burst'); }

  const spamWords = ['казино', 'заработок', 'крипт', 'инвест', 'porn', 'viagra'];
  if (spamWords.some((w) => body.toLowerCase().includes(w))) { score += 40; reasons.push('spamword'); }

  score = Math.min(100, score);
  return { score, shadowBan: score >= 50, reasons };
}
