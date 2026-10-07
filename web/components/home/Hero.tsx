import Link from 'next/link';

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Найдите друга. Спасите жизнь.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Животные Беларуси, которые ищут дом. Возьмите питомца, помогите рублём или станьте волонтёром.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/animals" className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Найти питомца</Link>
          {/* «Помочь рублём» (/help/general) появится с донатами в Plan 5 — до тех пор не ставим битую ссылку */}
          <Link href="/me/animals/new" className="rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700">Разместить животное</Link>
        </div>
      </div>
    </section>
  );
}
