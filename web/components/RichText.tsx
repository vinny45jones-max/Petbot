import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react';

export function RichText({ content }: { content: any }) {
  if (!content) return null;
  return <LexicalRichText data={content} />;
}
