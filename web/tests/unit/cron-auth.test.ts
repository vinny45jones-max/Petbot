import { describe, it, expect } from 'vitest';
import { isCronAuthorized } from '@/lib/security/cron-auth';

describe('isCronAuthorized', () => {
  it('пускает верный Bearer-секрет', () => {
    expect(isCronAuthorized('Bearer s3cret-value', 's3cret-value')).toBe(true);
  });
  it('отклоняет неверный секрет, другую длину, отсутствие заголовка и не-Bearer', () => {
    expect(isCronAuthorized('Bearer s3cret-valuX', 's3cret-value')).toBe(false);
    expect(isCronAuthorized('Bearer short', 's3cret-value')).toBe(false);
    expect(isCronAuthorized(null, 's3cret-value')).toBe(false);
    expect(isCronAuthorized('s3cret-value', 's3cret-value')).toBe(false);
  });
  it('без настроенного секрета не пускает никого', () => {
    expect(isCronAuthorized('Bearer ', '')).toBe(false);
    expect(isCronAuthorized('Bearer x', undefined)).toBe(false);
  });
});
