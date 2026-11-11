import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { DonationSummaryView } from '@/components/donate/DonationSummaryView';

afterEach(cleanup);
const view = (p: any) => render(createElement(DonationSummaryView, p));

describe('DonationSummaryView', () => {
  it('показывает собранное и число доноров, ведёт на страницу доната', () => {
    view({ total: 85, donors: 2, helpHref: '/help/animal/2-murka', enabled: true });
    expect(screen.getByText(/Собрано 85,00\sBYN · доноров: 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Помочь рублём' })).toHaveAttribute('href', '/help/animal/2-murka');
  });
  it('без оплат — призыв стать первым', () => {
    view({ total: 0, donors: 0, helpHref: '/help/organization/x', enabled: true });
    expect(screen.getByText('Станьте первым, кто поможет.')).toBeInTheDocument();
  });
  it('приём выключен и собранного нет — блок не показывается', () => {
    const { container } = view({ total: 0, donors: 0, helpHref: '/help/x', enabled: false });
    expect(container).toBeEmptyDOMElement();
  });
});
