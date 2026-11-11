'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Обычная POST-форма, которая отправляется сама после загрузки; без JS остаётся кнопка.
export function AutoSubmitForm({ action, fields, children }: { action: string; fields: Record<string, string>; children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    ref.current?.requestSubmit();
  }, []);
  return (
    <form ref={ref} action={action} method="POST">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
    </form>
  );
}
