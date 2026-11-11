import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createElement } from 'react';
const navigate = vi.fn();
vi.mock('@/lib/navigate', () => ({ navigate }));
const { DonationForm } = await import('@/components/donate/DonationForm');

const form = (props: any) => render(createElement(DonationForm, props));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); navigate.mockClear(); });

describe('DonationForm', () => {
  it('без подключённого ExpressPay показывает «скоро» и не даёт отправить', () => {
    form({ targetType: 'animal', targetTitle: 'Рекс №12', enabled: false });
    expect(screen.getByText(/скоро заработает/i)).toBeInTheDocument();
    expect(screen.getByText('Рекс №12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Перейти к оплате' })).toBeNull();
  });

  it('пресет суммы подставляется в поле, поля подписаны', () => {
    form({ targetType: 'general_fund', enabled: true });
    fireEvent.click(screen.getByRole('button', { name: '50 BYN' }));
    expect(screen.getByLabelText('Своя сумма, BYN')).toHaveValue('50');
    expect(screen.getByRole('button', { name: '50 BYN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/Email для чека/)).toBeInTheDocument();
  });

  it('счёт ЕРИП без страницы оплаты → переход на инструкцию с номером заказа', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, paymentUrl: null, eripNumber: 'don-12' }), { status: 200 })));
    form({ targetType: 'animal', targetSlug: 'rex', enabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Перейти к оплате' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/help/erip/don-12'));
  });

  it('оплата картой → переход на страницу оплаты ExpressPay', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, paymentUrl: 'https://pay.example/x', eripNumber: null }), { status: 200 })));
    form({ targetType: 'general_fund', enabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Перейти к оплате' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://pay.example/x'));
  });

  it('ошибка API показывается пользователю', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Слишком большая сумма' }), { status: 422 })));
    form({ targetType: 'general_fund', enabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Перейти к оплате' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Слишком большая сумма'));
  });
});
