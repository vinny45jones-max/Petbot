export interface AnimalDraft {
  species?: 'dog' | 'cat' | 'other';
  sex?: 'male' | 'female' | 'unknown';
  size?: 'small' | 'medium' | 'large';
  name?: string;
  ageYears?: number;
  ageMonths?: number;
  city?: string;
  description?: string;
  healthStatus?: string;
  contactPhone?: string;
  contactTelegram?: string;
  microchipId?: string;
  photoCount?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

const PHONE_RE = /^\+375\d{9}$/;
const MICROCHIP_RE = /^\d{15}$/;
const MIN_DESCRIPTION = 10;

export function validateAnimalDraft(d: AnimalDraft): ValidationResult {
  const errors: Record<string, string> = {};

  if (!d.species) errors.species = 'Укажите вид животного';
  if (!d.city) errors.city = 'Выберите город';
  if (!d.photoCount || d.photoCount < 1) errors.photos = 'Добавьте хотя бы одно фото';
  if (!d.description || d.description.trim().length < MIN_DESCRIPTION) {
    errors.description = `Опишите животное (минимум ${MIN_DESCRIPTION} символов)`;
  }

  const hasPhone = !!d.contactPhone?.trim();
  const hasTelegram = !!d.contactTelegram?.trim();
  if (!hasPhone && !hasTelegram) {
    errors.contact = 'Укажите хотя бы один контакт: телефон или Telegram';
  }
  if (hasPhone && !PHONE_RE.test(d.contactPhone!.trim())) {
    errors.contactPhone = 'Телефон в формате +375XXXXXXXXX';
  }
  if (d.microchipId && !MICROCHIP_RE.test(d.microchipId.trim())) {
    errors.microchipId = 'Чип — 15 цифр';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
