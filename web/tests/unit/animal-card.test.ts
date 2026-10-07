import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { AnimalCard } from '@/components/catalog/AnimalCard';

const base = {
  id: 1, petNumber: 7, slug: '7-rex', name: 'Рекс', species: 'dog', sex: 'male',
  city: { nameRu: 'Минск', slug: 'minsk' }, media: [], status: 'published',
} as any;

describe('AnimalCard — бейджи', () => {
  it('приют и спец-метки показываются один раз', () => {
    render(createElement(AnimalCard, { animal: { ...base, ownerType: 'organization', specialStatus: ['reserved'] } }));
    expect(screen.getAllByText('Приют')).toHaveLength(1);
    expect(screen.getByText('Забронирован')).toBeTruthy();
  });

  it('срочность — только живой отсчёт по дедлайну, без второго СРОЧНО из urgencyLevel', () => {
    const deadline = new Date(Date.now() + 2 * 86400000).toISOString();
    render(createElement(AnimalCard, { animal: { ...base, urgencyLevel: 'critical', legalDeadlineDate: deadline } }));
    expect(screen.getAllByText(/срочно/i)).toHaveLength(1);
    expect(screen.getByText(/Осталось 2 дн\./)).toBeTruthy();
  });
});
