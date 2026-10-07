import { describe, it, expect } from 'vitest';
import { computeResizeDimensions } from '@/lib/image-resize';

describe('computeResizeDimensions', () => {
  it('keeps dimensions under the cap unchanged', () => {
    expect(computeResizeDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it('scales down landscape by the longest side', () => {
    expect(computeResizeDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });
  it('scales down portrait by the longest side', () => {
    expect(computeResizeDimensions(2400, 3200, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it('rounds to integers', () => {
    const r = computeResizeDimensions(3000, 2001, 1600);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });
});
