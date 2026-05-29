import { describe, it, expect } from 'vitest';
import { buildR2StorageConfig } from '@/lib/storage/r2-adapter';

describe('r2-adapter', () => {
  it('throws if R2 env vars missing', () => {
    expect(() => buildR2StorageConfig({})).toThrow(/Missing R2_/);
  });

  it('builds config when env present', () => {
    const config = buildR2StorageConfig({
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET: 'bucket',
      R2_PUBLIC_URL: 'https://media.example',
    });
    expect(config.bucket).toBe('bucket');
    expect(config.config.endpoint).toContain('acc');
    expect(config.config.region).toBe('auto');
  });
});
