import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { verifyPayloadToken } from '@/lib/auth/payload-token';

const SECRET = 'unit-test-secret-key';
// Payload 3 подписывает JWT производным секретом: sha256(PAYLOAD_SECRET) hex, первые 32 символа.
const derived = crypto.createHash('sha256').update(SECRET).digest('hex').slice(0, 32);

describe('verifyPayloadToken', () => {
  it('принимает токен Payload и отдаёт id/role', async () => {
    const token = jwt.sign({ id: 5, collection: 'users', role: 'moderator', email: 'm@x.by' }, derived, { expiresIn: '1h' });
    expect(await verifyPayloadToken(token, SECRET)).toMatchObject({ id: 5, role: 'moderator' });
  });
  it('чужая подпись, мусор, просрочка → null', async () => {
    expect(await verifyPayloadToken(jwt.sign({ id: 5, role: 'moderator' }, 'other'), SECRET)).toBeNull();
    expect(await verifyPayloadToken(jwt.sign({ id: 5, role: 'moderator' }, SECRET), SECRET)).toBeNull();
    expect(await verifyPayloadToken('not-a-jwt', SECRET)).toBeNull();
    expect(await verifyPayloadToken(undefined, SECRET)).toBeNull();
    expect(await verifyPayloadToken(jwt.sign({ id: 5, exp: 1 }, derived), SECRET)).toBeNull();
  });
});
