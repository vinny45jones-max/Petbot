export interface GTerm { term: string; slug: string }
export type Segment = { text: string; slug?: string };

const WORD = /[a-zа-яё0-9]/i;

/** Размечает первое вхождение каждого термина (по границам слова, без перекрытий). Чистая. */
export function annotateGlossaryTerms(text: string, terms: GTerm[]): Segment[] {
  const marks: { start: number; end: number; slug: string }[] = [];
  const used = new Set<string>();
  const lower = text.toLowerCase();
  // длинные термины первыми: «временная передержка» важнее вложенной «передержки»
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);

  for (const t of sorted) {
    if (used.has(t.slug)) continue;
    const needle = t.term.toLowerCase();
    if (!needle) continue;
    let from = 0, idx = -1;
    while ((idx = lower.indexOf(needle, from)) !== -1) {
      const start = idx, end = idx + needle.length;
      const boundaryL = start === 0 || !WORD.test(text[start - 1]);
      const boundaryR = end === text.length || !WORD.test(text[end]);
      const overlaps = marks.some((m) => start < m.end && end > m.start);
      if (boundaryL && boundaryR && !overlaps) { marks.push({ start, end, slug: t.slug }); used.add(t.slug); break; }
      from = idx + needle.length;
    }
  }

  marks.sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start > pos) segs.push({ text: text.slice(pos, m.start) });
    segs.push({ text: text.slice(m.start, m.end), slug: m.slug });
    pos = m.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) });
  return segs;
}
