const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ў: 'u', // белорусские
};

export interface SlugifyOptions {
  maxLength?: number;
}

export function slugify(input: string, opts: SlugifyOptions = {}): string {
  let s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // диакритика
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (opts.maxLength && s.length > opts.maxLength) {
    // Check if we're cutting into a word (next char would be alphanumeric)
    const nextChar = s[opts.maxLength];
    s = s.slice(0, opts.maxLength);
    if (nextChar && /[a-z0-9]/.test(nextChar)) {
      // We're cutting into a word, backtrack to last dash
      const lastDash = s.lastIndexOf('-');
      if (lastDash > 0) {
        s = s.slice(0, lastDash);
      }
    }
    s = s.replace(/-+$/g, '');
  }
  return s;
}

export function slugifyRu(input: string, opts: SlugifyOptions = {}): string {
  const transliterated = Array.from(input.toLowerCase())
    .map((ch) => (ch in CYRILLIC_MAP ? CYRILLIC_MAP[ch] : ch))
    .join('');
  return slugify(transliterated, opts);
}

/**
 * Подбирает свободный slug. existsFn возвращает true, если slug занят.
 */
export async function uniqueSlug(
  base: string,
  existsFn: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsFn(base))) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!(await existsFn(candidate))) return candidate;
  }
  throw new Error(`uniqueSlug: exhausted suffixes for "${base}"`);
}
