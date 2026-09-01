import { describe, it, expect } from 'vitest';
import { buildAvatarGeometry } from './body-avatar-geometry';

describe('buildAvatarGeometry', () => {
  it('widens the whole silhouette monotonically with fatLevel', () => {
    const levels = [0, 0.25, 0.5, 0.75, 1];
    for (const gender of ['male', 'female'] as const) {
      const geos = levels.map((f) => buildAvatarGeometry(f, gender));
      for (let i = 1; i < geos.length; i++) {
        expect(geos[i].bellyHalf).toBeGreaterThan(geos[i - 1].bellyHalf);
        expect(geos[i].waistHalf).toBeGreaterThan(geos[i - 1].waistHalf);
        expect(geos[i].hipHalf).toBeGreaterThan(geos[i - 1].hipHalf);
        expect(geos[i].jawRx).toBeGreaterThan(geos[i - 1].jawRx);
        expect(geos[i].armW).toBeGreaterThan(geos[i - 1].armW);
        expect(geos[i].legW).toBeGreaterThanOrEqual(geos[i - 1].legW);
      }
    }
  });

  it('clamps fatLevel outside 0..1', () => {
    expect(buildAvatarGeometry(-1, 'male')).toEqual(buildAvatarGeometry(0, 'male'));
    expect(buildAvatarGeometry(2, 'male')).toEqual(buildAvatarGeometry(1, 'male'));
  });

  it('gives the female shape wider hips relative to waist than the male shape', () => {
    const male = buildAvatarGeometry(0.5, 'male');
    const female = buildAvatarGeometry(0.5, 'female');
    expect(female.hipHalf - female.waistHalf).toBeGreaterThan(male.hipHalf - male.waistHalf);
    expect(female.shoulderHalf).toBeLessThan(male.shoulderHalf);
  });

  it('only the female geometry has a top, bob curtains, and a bun', () => {
    const male = buildAvatarGeometry(0.5, 'male');
    const female = buildAvatarGeometry(0.5, 'female');
    expect(male.topPath).toBeNull();
    expect(male.hairCurtains).toBeNull();
    expect(female.topPath).toMatch(/^M /);
    expect(female.hairCurtains).toHaveLength(2);
    expect(female.hairBun).not.toBeNull();
  });

  it('produces well-formed closed paths', () => {
    for (const gender of ['male', 'female'] as const) {
      for (const f of [0, 0.5, 1]) {
        const geo = buildAvatarGeometry(f, gender);
        for (const path of [geo.torsoPath, geo.shortsPath, geo.hairDome]) {
          expect(path).toMatch(/^M /);
          expect(path.trim()).toMatch(/Z$/);
          expect(path).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });

  it('keeps the fat belly blob inside the belly silhouette at full scale', () => {
    for (const gender of ['male', 'female'] as const) {
      const geo = buildAvatarGeometry(1, gender);
      expect(geo.bellyBlob.rx).toBeLessThan(geo.bellyHalf);
    }
  });
});
