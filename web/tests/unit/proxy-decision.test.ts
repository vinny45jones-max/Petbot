import { describe, it, expect } from 'vitest';
import { proxyDecision } from '@/lib/proxy-decision';

const staff = { id: 5, role: 'moderator' };
const base = { maintenance: false, claims: null, twofaUid: null };

describe('proxyDecision: maintenance', () => {
  const m = { ...base, maintenance: true };
  it('публичный путь → страница техработ', () => {
    expect(proxyDecision({ ...m, pathname: '/animals' })).toEqual({ type: 'maintenance' });
  });
  it('healthcheck, статика, админка и вход — пропускаем', () => {
    for (const p of ['/api/health', '/api/health/ready', '/maintenance', '/_next/static/x.js', '/admin/login', '/api/users/login', '/favicon.ico']) {
      expect(proxyDecision({ ...m, pathname: p })).toEqual({ type: 'next' });
    }
  });
  it('staff ходит по сайту при техработах', () => {
    expect(proxyDecision({ ...m, pathname: '/animals', claims: staff, twofaUid: '5' })).toEqual({ type: 'next' });
  });
  it('режим выключен — не блокирует', () => {
    expect(proxyDecision({ ...base, pathname: '/animals' })).toEqual({ type: 'next' });
  });
});

describe('proxyDecision: 2FA-гейт', () => {
  it('staff без 2FA-cookie на /admin → редирект на /2fa', () => {
    expect(proxyDecision({ ...base, pathname: '/admin/collections/animals', claims: staff })).toEqual({ type: 'twofa', next: '/admin/collections/animals' });
  });
  it('cookie другого пользователя не подходит', () => {
    expect(proxyDecision({ ...base, pathname: '/admin', claims: staff, twofaUid: '6' })).toEqual({ type: 'twofa', next: '/admin' });
  });
  it('staff с 2FA → пропускаем', () => {
    expect(proxyDecision({ ...base, pathname: '/admin', claims: staff, twofaUid: '5' })).toEqual({ type: 'next' });
  });
  it('выход из админки разрешён без 2FA', () => {
    expect(proxyDecision({ ...base, pathname: '/admin/logout', claims: staff })).toEqual({ type: 'next' });
  });
  it('не-staff и аноним на /admin — решает Payload', () => {
    expect(proxyDecision({ ...base, pathname: '/admin', claims: { id: 7, role: 'citizen' } })).toEqual({ type: 'next' });
    expect(proxyDecision({ ...base, pathname: '/admin' })).toEqual({ type: 'next' });
  });
  it('REST API для staff без 2FA закрыт, кроме входа/выхода/me/2fa', () => {
    expect(proxyDecision({ ...base, pathname: '/api/animals/3', claims: staff })).toEqual({ type: 'forbidden' });
    for (const p of ['/api/users/login', '/api/users/logout', '/api/users/me', '/api/users/refresh-token', '/api/auth/2fa/gate', '/api/health']) {
      expect(proxyDecision({ ...base, pathname: p, claims: staff })).toEqual({ type: 'next' });
    }
    expect(proxyDecision({ ...base, pathname: '/api/animals/3', claims: staff, twofaUid: '5' })).toEqual({ type: 'next' });
  });
  it('обычные страницы сайта staff без 2FA открываются', () => {
    expect(proxyDecision({ ...base, pathname: '/me/security', claims: staff })).toEqual({ type: 'next' });
  });
});
