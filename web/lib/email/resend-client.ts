import { Resend } from 'resend';
import type { ReactElement } from 'react';

let cached: Resend | null = null;

function getClient(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  cached = new Resend(key);
  return cached;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail(args: SendEmailArgs) {
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@pet-aggregator.by';
  const client = getClient();
  return await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    react: args.react,
  });
}
