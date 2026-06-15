export interface NewAnimalMsg {
  petNumber: number;
  name?: string | null;
  species: string;
  city?: string;
  adminUrl: string;
}

const SPECIES_RU: Record<string, string> = { dog: 'собака', cat: 'кошка', other: 'животное' };

export function newAnimalAdminMessage(a: NewAnimalMsg): string {
  const title = a.name ? `${a.name} №${a.petNumber}` : `№${a.petNumber}`;
  return [
    'Новое объявление на модерацию',
    `${title} — ${SPECIES_RU[a.species] ?? 'животное'}${a.city ? `, ${a.city}` : ''}`,
    `Проверить: ${a.adminUrl}`,
  ].join('\n');
}

export interface NewInquiryMsg {
  animalTitle: string;
  applicantName?: string;
  phone?: string;
  telegram?: string;
}

export function newInquiryMessage(i: NewInquiryMsg): string {
  return [
    `Новая заявка на усыновление: ${i.animalTitle}`,
    i.applicantName ? `От: ${i.applicantName}` : null,
    i.phone ? `Телефон: ${i.phone}` : null,
    i.telegram ? `Telegram: ${i.telegram}` : null,
  ].filter(Boolean).join('\n');
}
