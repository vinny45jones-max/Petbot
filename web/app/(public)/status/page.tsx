import { aggregateHealth, type CheckState } from '@/lib/health';
import { checkHealth } from '@/lib/health-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Статус сервиса', robots: { index: false } };

const LABEL: Record<CheckState, string> = { ok: 'работает', error: 'сбой', off: 'не подключено' };
const COLOR: Record<CheckState, string> = { ok: 'text-green-700', error: 'text-red-700', off: 'text-gray-500' };

export default async function StatusPage() {
  const { status, checks } = aggregateHealth(await checkHealth());
  const rows: [string, CheckState][] = [['База данных', checks.db], ['Хранилище фото', checks.storage]];
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Статус сервиса</h1>
      <p data-testid="overall-status" className={status === 'ok' ? 'text-green-700' : 'text-red-700'}>
        {status === 'ok' ? 'Все системы работают.' : 'Есть сбои, мы уже разбираемся.'}
      </p>
      <ul className="divide-y rounded-xl border">
        {rows.map(([name, s]) => (
          <li key={name} className="flex justify-between p-3"><span>{name}</span><span className={COLOR[s]}>{LABEL[s]}</span></li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">Проверено: {new Date().toLocaleString('ru-BY', { timeZone: 'Europe/Minsk' })}</p>
    </div>
  );
}
