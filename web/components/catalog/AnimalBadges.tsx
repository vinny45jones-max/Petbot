import { computeAnimalBadges, type AnimalBadgeInput, type BadgeTone } from '@/lib/badges';

const TONE: Record<BadgeTone, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-orange-500 text-white',
  info: 'bg-blue-600 text-white',
  success: 'bg-green-600 text-white',
  neutral: 'bg-gray-700 text-white',
};

export function AnimalBadges({ animal, className = '' }: { animal: AnimalBadgeInput; className?: string }) {
  const badges = computeAnimalBadges(animal);
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map((b, i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[b.tone]}`}>{b.label}</span>
      ))}
    </div>
  );
}
