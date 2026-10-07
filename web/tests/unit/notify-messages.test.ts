import { describe, it, expect } from 'vitest';
import { newAnimalAdminMessage, newInquiryMessage } from '@/lib/notify/messages';

describe('newAnimalAdminMessage', () => {
  it('mentions moderation and pet title', () => {
    const m = newAnimalAdminMessage({ petNumber: 12, name: 'Рекс', species: 'dog', city: 'Минск', adminUrl: 'https://x/admin/collections/animals/5' });
    expect(m).toContain('модерац');
    expect(m).toContain('Рекс');
    expect(m).toContain('№12');
    expect(m).toContain('https://x/admin/collections/animals/5');
  });
  it('handles missing name', () => {
    const m = newAnimalAdminMessage({ petNumber: 7, name: null, species: 'cat', city: 'Брест', adminUrl: 'u' });
    expect(m).toContain('№7');
  });
});

describe('newInquiryMessage', () => {
  it('includes applicant contacts and animal title', () => {
    const m = newInquiryMessage({ animalTitle: 'Мурка №3', applicantName: 'Иван', phone: '+375291112233', telegram: '@ivan' });
    expect(m).toContain('Мурка №3');
    expect(m).toContain('Иван');
    expect(m).toContain('+375291112233');
    expect(m).toContain('@ivan');
  });
});
