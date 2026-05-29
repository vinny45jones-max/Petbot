import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { issueSessionToken } from '@/lib/auth/session';

describe('issueSessionToken', () => {
  it('подписывает payload-token, верифицируемый секретом', () => {
    process.env.PAYLOAD_SECRET = 'test-secret';
    const token = issueSessionToken({ id: 'u1', email: 'a@b.by' });
    const decoded = jwt.verify(token, 'test-secret') as any;
    expect(decoded.id).toBe('u1');
    expect(decoded.collection).toBe('users');
    expect(decoded.email).toBe('a@b.by');
  });
});
