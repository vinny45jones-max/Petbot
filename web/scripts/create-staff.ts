// Создать или повысить учётку staff (superadmin/moderator) без письма подтверждения.
// npm run staff:create -- <email> [superadmin|moderator]
// Для боевой базы: NODE_ENV=production DATABASE_URL=<прод> (без NODE_ENV Payload начнёт менять схему push-ем).
// Новому пользователю генерируется пароль и печатается один раз — после входа его нужно сменить.
import { config as loadEnv } from 'dotenv';
import crypto from 'node:crypto';
import { getPayload } from 'payload';

loadEnv({ path: '.env.local' });
loadEnv();

const [email, role = 'superadmin'] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['superadmin', 'moderator'].includes(role)) {
  console.error('Использование: npm run staff:create -- <email> [superadmin|moderator]');
  process.exit(1);
}

const { default: config } = await import('../payload.config.ts');
const payload = await getPayload({ config });

const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true });
if (found.docs.length) {
  await payload.update({ collection: 'users', id: found.docs[0].id, data: { role, _verified: true } as never, overrideAccess: true });
  console.log(`[staff] ${email}: роль ${role}, email подтверждён. Пароль не менялся.`);
} else {
  const password = crypto.randomBytes(12).toString('base64url');
  await payload.create({
    collection: 'users',
    data: { email, password, role, _verified: true, ageConfirmed: true, consentPersonalData: true } as never,
    overrideAccess: true,
  });
  console.log(`[staff] создан ${email} (${role}). Временный пароль: ${password}`);
}
process.exit(0);
