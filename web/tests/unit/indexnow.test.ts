import { describe, it, expect } from 'vitest';
import { buildIndexNowBody } from '@/lib/seo/indexnow';

describe('buildIndexNowBody', () => {
  it('собирает host, keyLocation и абсолютные URL', () => {
    expect(buildIndexNowBody('https://pet.by/', 'abc123', ['/animals/minsk/dog/12-reks', 'https://pet.by/x'])).toEqual({
      host: 'pet.by',
      key: 'abc123',
      keyLocation: 'https://pet.by/indexnow-key',
      urlList: ['https://pet.by/animals/minsk/dog/12-reks', 'https://pet.by/x'],
    });
  });
  it('без ключа, базового URL или ссылок — null (no-op)', () => {
    expect(buildIndexNowBody('https://pet.by', undefined, ['/a'])).toBeNull();
    expect(buildIndexNowBody(undefined, 'k', ['/a'])).toBeNull();
    expect(buildIndexNowBody('https://pet.by', 'k', [])).toBeNull();
  });
  it('localhost не пингуется', () => {
    expect(buildIndexNowBody('http://localhost:3000', 'k', ['/a'])).toBeNull();
  });
});
