export const metadata = { title: 'Подтверждение email' };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ sent?: string; token?: string }> }) {
  const sp = await searchParams;
  if (sp.sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">Письмо отправлено</h1>
        <p>Проверьте почту и нажмите ссылку для подтверждения. Ссылка действует 24 часа.</p>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">Подтверждение email</h1>
      <form action="/api/users/verify" method="POST">
        <input type="hidden" name="token" value={sp.token || ''} />
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded">Подтвердить</button>
      </form>
    </div>
  );
}
