import { describe, it, expect } from 'vitest';
import { extractPlainText } from '@/lib/lexical-plain';

describe('extractPlainText', () => {
  it('returns empty string for null/undefined', () => {
    expect(extractPlainText(null)).toBe('');
    expect(extractPlainText(undefined)).toBe('');
  });
  it('joins text nodes with spaces', () => {
    const rt = { root: { children: [
      { type: 'paragraph', children: [{ type: 'text', text: 'Добрый' }, { type: 'text', text: 'пёс' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'любит детей' }] },
    ] } };
    expect(extractPlainText(rt)).toBe('Добрый пёс любит детей');
  });
  it('recurses nested children', () => {
    const rt = { root: { children: [
      { type: 'list', children: [{ type: 'listitem', children: [{ type: 'text', text: 'привит' }] }] },
    ] } };
    expect(extractPlainText(rt)).toBe('привит');
  });
});
