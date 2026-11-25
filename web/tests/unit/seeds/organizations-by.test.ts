import { describe, it, expect } from 'vitest';
import { organizationsBY, intakeFacilityContactsBY } from '@/lib/seeds/organizations-by';
import { citiesBY } from '@/lib/seeds/cities-by';
import { intakeFacilitiesBY } from '@/lib/seeds/intake-facilities-by';

const cityNames = new Set(citiesBY.map((c) => c.nameRu));

describe('organizationsBY seed', () => {
  it('has unique names (seed dedupes by name)', () => {
    const names = organizationsBY.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('links only to cities that exist in citiesBY', () => {
    for (const o of organizationsBY) {
      if (o.cityName) expect(cityNames.has(o.cityName), o.name).toBe(true);
    }
  });

  it('keeps a place for every org without a city', () => {
    for (const o of organizationsBY) {
      if (!o.cityName) expect(o.address, o.name).toBeTruthy();
    }
  });

  it('stores links as absolute URLs', () => {
    for (const o of organizationsBY) {
      for (const url of [o.websiteUrl, o.instagramUrl, o.vkUrl, o.tgUrl]) {
        if (url) expect(url, o.name).toMatch(/^https?:\/\//);
      }
    }
  });

  it('names a source for every org', () => {
    for (const o of organizationsBY) expect(o.source, o.name).toBeTruthy();
  });
});

describe('intakeFacilityContactsBY', () => {
  it('targets facilities that the main seed creates', () => {
    const facilityNames = new Set(intakeFacilitiesBY.map((f) => f.name));
    for (const name of Object.keys(intakeFacilityContactsBY)) expect(facilityNames.has(name), name).toBe(true);
  });
});
