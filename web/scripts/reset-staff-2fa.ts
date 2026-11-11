// Сбросить 2FA учётке (потерян телефон и резервные коды). После сброса человек входит по паролю и заново
// настраивает 2FA в «Кабинет → Безопасность».
// npm run staff:reset-2fa -- <email>
// Для боевой базы: NODE_ENV=production DATABASE_URL=<прод> (без NODE_ENV Payload начнёт менять схему push-ем).
import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';

loadEnv({ path: '.env.local' });
loadEnv();

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Использование: npm run staff:reset-2fa -- <email>');
  process.exit(1);
}

const { default: config } = await import('../payload.config.ts');
const { resetTwofa } = await import('../lib/auth/twofa.ts');
const payload = await getPayload({ config });

const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true });
if (!found.docs.length) {
  console.error(`[2fa] ${email}: пользователь не найден`);
  process.exit(1);
}
await resetTwofa(payload, found.docs[0].id);
console.log(`[2fa] ${email}: 2FA сброшена, запись в журнале аудита (2fa.reset).`);
process.exit(0);
