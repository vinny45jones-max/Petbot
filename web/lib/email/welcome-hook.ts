// Welcome-письмо после регистрации (§16.2). Ошибка почты не должна ронять создание пользователя.
import { createElement, type ReactElement } from 'react';
import WelcomeEmail from '@/lib/email/templates/welcome';

type SendFn = (args: { to: string; subject: string; react: ReactElement }) => Promise<unknown>;

const PLACEHOLDER_DOMAINS = ['@telegram.local'];

export async function sendWelcomeOnCreate(
  args: { doc: { email?: string | null; firstName?: string | null }; operation: string },
  send: SendFn,
): Promise<void> {
  const email = args.doc?.email?.trim();
  if (args.operation !== 'create' || !email) return;
  if (PLACEHOLDER_DOMAINS.some((d) => email.endsWith(d))) return;
  try {
    await send({
      to: email,
      subject: 'Добро пожаловать в Pet Aggregator BY',
      react: createElement(WelcomeEmail, {
        firstName: args.doc.firstName ?? undefined,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pet-aggregator.by',
      }),
    });
  } catch (e) {
    console.warn('[welcome-email] не отправлено:', (e as Error).message);
  }
}
