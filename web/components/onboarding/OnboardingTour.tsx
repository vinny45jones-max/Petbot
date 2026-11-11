'use client';
import { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, ONBOARDING_COOKIE, ONBOARDING_STEPS, shouldShowOnboarding,
} from '@/lib/onboarding';

function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1];
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const check = () => {
      if (shouldShowOnboarding(readCookie(ONBOARDING_COOKIE), localStorage.getItem(COOKIE_CONSENT_KEY))) setOpen(true);
    };
    check();
    window.addEventListener(COOKIE_CONSENT_EVENT, check);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, check);
  }, []);

  function dismiss() {
    setOpen(false);
    document.cookie = `${ONBOARDING_COOKIE}=seen; path=/; max-age=31536000; samesite=lax`;
  }

  if (!open) return null;
  const s = ONBOARDING_STEPS[step];
  const last = step === ONBOARDING_STEPS.length - 1;

  return (
    <div role="dialog" aria-label="Знакомство с сайтом"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 w-[min(92vw,420px)] rounded-xl border bg-white p-5 shadow-lg">
      <p className="text-xs text-gray-500">Шаг {step + 1} из {ONBOARDING_STEPS.length}</p>
      <h2 className="mt-1 text-lg font-semibold">{s.title}</h2>
      <p className="mt-1 text-sm">{s.body}</p>
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={dismiss} className="text-sm text-gray-600 underline">Пропустить</button>
        <button type="button" onClick={() => (last ? dismiss() : setStep(step + 1))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {last ? 'Понятно' : 'Далее'}
        </button>
      </div>
    </div>
  );
}
