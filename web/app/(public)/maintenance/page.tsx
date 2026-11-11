export const metadata = { title: 'Технические работы', robots: { index: false } };

export default function MaintenancePage() {
  return (
    <div className="mx-auto mt-24 max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold">Идут технические работы</h1>
      <p className="mt-2 text-gray-600">Сайт скоро вернётся. Спасибо за терпение.</p>
    </div>
  );
}
