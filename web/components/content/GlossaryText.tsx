import Link from 'next/link';
import { annotateGlossaryTerms, type GTerm } from '@/lib/glossary-annotate';

/** Рендерит plain-текст, превращая известные термины в ссылки на /glossary#slug (пунктир). */
export function GlossaryText({ text, terms }: { text: string; terms: GTerm[] }) {
  const segs = annotateGlossaryTerms(text, terms);
  return (
    <>
      {segs.map((s, i) =>
        s.slug
          ? <Link key={i} href={`/glossary#${s.slug}`} className="underline decoration-dotted underline-offset-2" title="Открыть в глоссарии">{s.text}</Link>
          : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}
