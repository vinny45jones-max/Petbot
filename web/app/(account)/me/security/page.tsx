import { requireUser } from '@/lib/auth/current-user';
import { isAdmin } from '@/lib/auth/rbac';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export const metadata = { title: 'Безопасность' };

export default async function SecurityPage() {
  const user = await requireUser();
  const enabled = Boolean(user.totpEnabled);
  // twofaRequired: staff без пройденной 2FA (роль понижена хуком Users.afterRead)
  const staff = isAdmin(user) || Boolean((user as { twofaRequired?: boolean }).twofaRequired);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Безопасность</h1>
      {staff && !enabled && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Для входа в админку модератора нужна двухфакторная аутентификация. Включите её ниже.
        </p>
      )}
      {/* 2FA — для модераторов (§16.2); включённую раньше можно выключить и после смены роли */}
      {(staff || enabled) && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Двухфакторная аутентификация (TOTP)</h2>
          <TwoFactorSetup enabled={enabled} />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Смена пароля</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
