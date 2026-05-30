/** Рекурсивно собирает текст из Lexical/Payload richText в одну строку. */
export function extractPlainText(value: any): string {
  if (!value) return '';
  const root = value.root ?? value;
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === 'string') parts.push(node.text);
    const children = node.children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  if (Array.isArray(root?.children)) root.children.forEach(walk);
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
