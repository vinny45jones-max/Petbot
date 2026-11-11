export interface DonationRow {
  id?: string | number;
  amountByn: number;
  status: string;
  donorUser?: string | number | { id: string | number } | null;
  donorEmail?: string | null;
}

const isPaid = (r: DonationRow) => r.status === 'paid';

export function sumPaidByn(rows: DonationRow[]): number {
  const total = rows.filter(isPaid).reduce((s, r) => s + (r.amountByn || 0), 0);
  return Math.round(total * 100) / 100;
}

/** Уникальные доноры: по пользователю, иначе по email; анонимный донат без email — отдельный донор. */
export function donorCount(rows: DonationRow[]): number {
  const keys = new Set<string>();
  rows.filter(isPaid).forEach((r, i) => {
    const user = r.donorUser && typeof r.donorUser === 'object' ? r.donorUser.id : r.donorUser;
    if (user != null) keys.add(`u:${user}`);
    else if (r.donorEmail) keys.add(`e:${r.donorEmail.toLowerCase()}`);
    else keys.add(`anon:${r.id ?? i}`);
  });
  return keys.size;
}
