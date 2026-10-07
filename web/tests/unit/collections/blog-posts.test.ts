import { describe, it, expect } from 'vitest';
import { BlogPosts } from '@/collections/BlogPosts';

const hook = BlogPosts.hooks!.beforeChange![0] as any;

// Фейковый req.payload.find: занятые slug'и перечислены в taken.
const reqWith = (taken: string[]) => ({
  payload: {
    find: async ({ where }: any) => ({
      docs: taken.includes(where.slug.equals) ? [{ id: 'other', slug: where.slug.equals }] : [],
    }),
  },
});

describe('BlogPosts beforeChange', () => {
  it('генерирует slug из заголовка транслитом', async () => {
    const data = await hook({ data: { title: 'Как взять собаку' }, req: reqWith([]), operation: 'create' });
    expect(data.slug).toBe('kak-vzyat-sobaku');
  });

  it('при занятом slug добавляет суффикс', async () => {
    const data = await hook({ data: { title: 'Новости' }, req: reqWith(['novosti']), operation: 'create' });
    expect(data.slug).toBe('novosti-2');
  });

  it('заголовок без транслитерируемых символов → slug post', async () => {
    const data = await hook({ data: { title: '!!!' }, req: reqWith([]), operation: 'create' });
    expect(data.slug).toBe('post');
  });

  it('при публикации ставит publishedAt, если не задан', async () => {
    const data = await hook({ data: { title: 'A', slug: 'a', status: 'published' }, req: reqWith([]), operation: 'update' });
    expect(typeof data.publishedAt).toBe('string');
  });

  it('черновику publishedAt не ставит', async () => {
    const data = await hook({ data: { title: 'A', slug: 'a', status: 'draft' }, req: reqWith([]), operation: 'create' });
    expect(data.publishedAt).toBeUndefined();
  });
});
