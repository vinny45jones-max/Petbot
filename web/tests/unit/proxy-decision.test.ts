import { describe, it, expect } from 'vitest';
import { proxyDecision } from '@/lib/proxy-decision';

const staff = { id: 5, role: 'moderator' };
const base = { maintenance: false, claims: null, twofaOk: false };

describe('proxyDecision: maintenance', () => {
  const m = { ...base, maintenance: true };
  it('публичный путь → страница техработ', () => {
    expect(proxyDecision({ ...m, pathname: '/animals' })).toEqual({ type: 'maintenance' });
  });
  it('healthcheck, статус, статика, админка, вход, вебхук оплаты и cron — пропускаем', () => {
    for (const p of ['/api/health', '/api/health/ready', '/status', '/maintenance', '/_next/static/x.js', '/admin/login',
      '/api/users/login', '/favicon.ico', '/api/donations/expresspay/webhook', '/api/cron/donations-reconcile']) {
      expect(proxyDecision({ ...m, pathname: p })).toEqual({ type: 'next' });
    }
  });
  it('создание доната при техработах закрыто', () => {
    expect(proxyDecision({ ...m, pathname: '/api/donations/expresspay' })).toEqual({ type: 'maintenance' });
  });
  it('staff ходит по сайту при техработах', () => {
    expect(proxyDecision({ ...m, pathname: '/animals', claims: staff })).toEqual({ type: 'next' });
  });
  it('режим выключен — не блокирует', () => {
    expect(proxyDecision({ ...base, pathname: '/animals' })).toEqual({ type: 'next' });
  });
});

describe('proxyDecision: 2FA-редирект админки (UX; защита — в Payload)', () => {
  it('staff без 2FA на /admin → /2fa с сохранением пути', () => {
    expect(proxyDecision({ ...base, pathname: '/admin/collections/animals', search: '?page=2', claims: staff }))
      .toEqual({ type: 'twofa', next: '/admin/collections/animals?page=2' });
  });
  it('staff с 2FA → пропускаем', () => {
    expect(proxyDecision({ ...base, pathname: '/admin', claims: staff, twofaOk: true })).toEqual({ type: 'next' });
  });
  it('выход и вход в админку разрешены без 2FA', () => {
    expect(proxyDecision({ ...base, pathname: '/admin/logout', claims: staff })).toEqual({ type: 'next' });
    expect(proxyDecision({ ...base, pathname: '/admin/login', claims: staff })).toEqual({ type: 'next' });
  });
  it('не-staff и аноним на /admin — решает Payload', () => {
    expect(proxyDecision({ ...base, pathname: '/admin', claims: { id: 7, role: 'citizen' } })).toEqual({ type: 'next' });
    expect(proxyDecision({ ...base, pathname: '/admin' })).toEqual({ type: 'next' });
  });
  it('API proxy не трогает — права режет Payload по роли из БД', () => {
    expect(proxyDecision({ ...base, pathname: '/api/animals/3', claims: staff })).toEqual({ type: 'next' });
  });
});
