export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const ok = (): ValidationResult => ({ ok: true, errors: [] });
const fail = (...errors: string[]): ValidationResult => ({ ok: false, errors });

export function validateComment(input: { body?: string }): ValidationResult {
  const body = (input.body ?? '').trim();
  if (body.length < 1) return fail('Комментарий пустой');
  if (body.length > 2000) return fail('Комментарий длиннее 2000 символов');
  return ok();
}

export function validateCrueltyReport(input: { description?: string; contact?: string }): ValidationResult {
  const desc = (input.description ?? '').trim();
  if (desc.length < 20) return fail('Опишите ситуацию подробнее (минимум 20 символов)');
  if (desc.length > 5000) return fail('Слишком длинное описание');
  return ok();
}

export function validatePartnerApplication(input: { name?: string; contact?: string; unp?: string }): ValidationResult {
  const errors: string[] = [];
  if (!(input.name ?? '').trim()) errors.push('Укажите название организации');
  if (!(input.contact ?? '').trim()) errors.push('Укажите контакт для связи');
  const unp = (input.unp ?? '').trim();
  if (unp && !/^\d{9}$/.test(unp)) errors.push('УНП должен состоять из 9 цифр');
  if (!unp) errors.push('Укажите УНП');
  return errors.length ? { ok: false, errors } : ok();
}
