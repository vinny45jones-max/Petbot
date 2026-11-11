import { requireUser } from '@/lib/auth/current-user';
import { isAdmin } from '@/lib/auth/rbac';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

export const metadata = { title: 'Безопасность' };

export default async function SecurityPage() {
  const user = await requireUser();
  const enabled = Boolean(user.totpEnabled);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Безопасность</h1>
      {/* twofaRequired: staff без пройденной 2FA (роль понижена хуком Users.afterRead) */}
      {(isAdmin(user) || (user as { twofaRequired?: boolean }).twofaRequired) && !enabled && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Для входа в админку модератора нужна двухфакторная аутентификация. Включите её ниже.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Двухфакторная аутентификация (TOTP)</h2>
        <TwoFactorSetup enabled={enabled} />
      </section>
    </div>
  );
}
