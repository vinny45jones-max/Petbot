import { Suspense } from 'react';
import { TwoFactorGate } from '@/components/auth/TwoFactorGate';

export const metadata = { title: 'Подтверждение входа', robots: { index: false } };

export default function TwoFactorPage() {
  return <Suspense><TwoFactorGate /></Suspense>;
}
