import { notFound } from 'next/navigation';

// Catch-all для несопоставленных URL. Без общего app/layout.tsx (multiple root
// layouts) глобальный app/not-found.tsx запрещён ("doesn't have a root layout").
// Заводим неподходящие пути в группу (public) и кидаем notFound() → рендерится
// (public)/not-found.tsx внутри (public)-layout. /admin и /api перехватывает
// группа (payload) раньше (явные маршруты приоритетнее catch-all).
export default function CatchAllNotFound() {
  notFound();
}
