export interface AvatarCapsule {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  transform?: string;
}

export interface AvatarGeometry {
  // raw dimensions (exposed for tests)
  headRx: number;
  jawRx: number;
  jawRy: number;
  shoulderHalf: number;
  waistHalf: number;
  bellyHalf: number;
  hipHalf: number;
  armW: number;
  armAngle: number;
  legW: number;
  // shapes
  neck: AvatarCapsule;
  armLeft: AvatarCapsule;
  armRight: AvatarCapsule;
  legLeft: AvatarCapsule;
  legRight: AvatarCapsule;
  torsoPath: string;
  shortsPath: string;
  waistband: { x: number; y: number; w: number; h: number };
  topPath: string | null; // female sports top
  feet: { leftCx: number; rightCx: number; cy: number; rx: number };
  hairBack: string | null; // female bob volume, drawn behind the head
  hairDome: string; // cap + fringe, drawn over the face
  hairCurtains: string[] | null; // female face-framing strands
  hairBun: { cx: number; cy: number; r: number } | null;
  bellyBlob: { cx: number; cy: number; rx: number; ry: number }; // belly roundness shading
}

export const AVATAR_VIEWBOX = '0 0 140 200';
export const AVATAR_ASPECT = 0.7; // width / height

const CX = 70;
export const HEAD_CY = 46;
export const HEAD_RY = 31;
export const EYE_Y = 50;
export const EYE_DX = 11;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * All chibi body dimensions as functions of fatLevel — the silhouette
 * itself widens (belly, waist, hips, cheeks, limbs) as fat increases,
 * so losing weight visibly slims the whole character.
 */
export function buildAvatarGeometry(fatLevel: number, gender: 'male' | 'female'): AvatarGeometry {
  const f = clamp01(fatLevel);
  const male = gender === 'male';

  const headRx = r1(male ? lerp(29, 32, f) : lerp(28, 31, f));
  const jawRx = r1(male ? lerp(18, 27, f) : lerp(17, 26, f));
  const jawRy = r1(male ? lerp(6, 13, f) : lerp(6, 12, f));
  const neckHalf = r1(male ? lerp(7, 11, f) : lerp(6, 10, f));
  const shoulderHalf = r1(male ? lerp(20, 27, f) : lerp(17, 25, f));
  const waistHalf = r1(male ? lerp(13, 33, f) : lerp(11, 31, f));
  const bellyHalf = r1(male ? lerp(15, 38, f) : lerp(13, 35, f));
  const hipHalf = r1(male ? lerp(16, 30, f) : lerp(18, 32, f));
  const armW = r1(male ? lerp(7, 14, f) : lerp(6, 13, f));
  const armAngle = r1(male ? lerp(6, 22, f) : lerp(6, 20, f));
  const legW = r1(male ? lerp(11, 18, f) : lerp(11, 19, f));
  const legGapHalf = r1(lerp(4, 7, f));
  const footRx = r1(lerp(9, 11, f));
  const bellySag = r1(lerp(118, 124, f)); // belly bottom sags over the waistband when fat

  const torsoPath =
    `M ${CX - shoulderHalf},80 ` +
    `Q ${CX},74 ${CX + shoulderHalf},80 ` +
    `C ${CX + shoulderHalf + 2},90 ${CX + waistHalf + 2},96 ${CX + bellyHalf},112 ` +
    `C ${CX + bellyHalf + 1},${bellySag} ${CX + hipHalf + 2},126 ${CX + hipHalf},132 ` +
    `L ${CX - hipHalf},132 ` +
    `C ${CX - hipHalf - 2},126 ${CX - bellyHalf - 1},${bellySag} ${CX - bellyHalf},112 ` +
    `C ${CX - waistHalf - 2},96 ${CX - shoulderHalf - 2},90 ${CX - shoulderHalf},80 Z`;

  const armPivotY = 88;
  const armLeft: AvatarCapsule = {
    x: r1(CX - shoulderHalf - armW + 3),
    y: 84,
    w: armW,
    h: 40,
    rx: armW / 2,
    transform: `rotate(${armAngle} ${r1(CX - shoulderHalf + 3)} ${armPivotY})`,
  };
  const armRight: AvatarCapsule = {
    x: r1(CX + shoulderHalf - 3),
    y: 84,
    w: armW,
    h: 40,
    rx: armW / 2,
    transform: `rotate(${-armAngle} ${r1(CX + shoulderHalf - 3)} ${armPivotY})`,
  };

  const legLeft: AvatarCapsule = { x: r1(CX - legGapHalf - legW), y: 128, w: legW, h: 58, rx: legW / 2 };
  const legRight: AvatarCapsule = { x: r1(CX + legGapHalf), y: 128, w: legW, h: 58, rx: legW / 2 };

  const shortsTopHalf = r1(lerp(bellyHalf, hipHalf, 0.55) + 1);
  const shortsPath =
    `M ${CX - shortsTopHalf},118 L ${CX + shortsTopHalf},118 ` +
    `Q ${CX + hipHalf + 3},130 ${CX + hipHalf + 1},146 ` +
    `L ${CX + legGapHalf + 2},146 L ${CX},136 L ${CX - legGapHalf - 2},146 ` +
    `L ${CX - hipHalf - 1},146 ` +
    `Q ${CX - hipHalf - 3},130 ${CX - shortsTopHalf},118 Z`;

  const chestLoHalf = r1(lerp(shoulderHalf, waistHalf, 0.55) + 1);
  const topPath = male
    ? null
    : `M ${CX - shoulderHalf + 1},82 Q ${CX},78 ${CX + shoulderHalf - 1},82 ` +
      `L ${CX + chestLoHalf},98 Q ${CX},104 ${CX - chestLoHalf},98 Z`;

  // Hair — a dome capping the head; hats/crowns draw over it
  const hrx = r1(headRx + 2);
  const hairDome = male
    ? // Short crop with three soft fringe tufts
      `M ${CX - hrx},47 A ${hrx} 34 0 0 1 ${CX + hrx},47 ` +
      `Q ${CX + hrx - 1},40 ${CX + hrx - 7},37 ` +
      `Q ${CX + 13},43 ${CX + 7},34 ` +
      `Q ${CX - 1},43 ${CX - 8},33 ` +
      `Q ${CX - 15},43 ${CX - hrx + 7},37 ` +
      `Q ${CX - hrx + 1},40 ${CX - hrx},47 Z`
    : // Side-swept bangs
      `M ${CX - hrx},46 A ${hrx} 33 0 0 1 ${CX + hrx},46 ` +
      `Q ${CX + hrx - 2},38 ${CX + hrx - 9},34 ` +
      `Q ${CX + 4},46 ${CX - 4},33 ` +
      `Q ${CX - hrx + 9},35 ${CX - hrx},46 Z`;
  const hairBack = male
    ? null
    : `M ${CX - hrx - 3},44 A ${hrx + 3} 34 0 0 1 ${CX + hrx + 3},44 ` +
      `L ${CX + hrx + 3},60 Q ${CX + hrx + 3},74 ${CX + hrx - 9},74 ` +
      `L ${CX - hrx + 9},74 Q ${CX - hrx - 3},74 ${CX - hrx - 3},60 Z`;
  const hairCurtains = male
    ? null
    : [
        `M ${CX - hrx - 1},44 Q ${CX - hrx - 4},58 ${CX - hrx + 1},68 Q ${CX - hrx + 6},60 ${CX - hrx + 5},44 Z`,
        `M ${CX + hrx + 1},44 Q ${CX + hrx + 4},58 ${CX + hrx - 1},68 Q ${CX + hrx - 6},60 ${CX + hrx - 5},44 Z`,
      ];
  const hairBun = male ? null : { cx: CX, cy: 15, r: 8 };

  return {
    headRx,
    jawRx,
    jawRy,
    shoulderHalf,
    waistHalf,
    bellyHalf,
    hipHalf,
    armW,
    armAngle,
    legW,
    neck: { x: r1(CX - neckHalf), y: 72, w: neckHalf * 2, h: 12, rx: 3 },
    armLeft,
    armRight,
    legLeft,
    legRight,
    torsoPath,
    shortsPath,
    waistband: { x: r1(CX - shortsTopHalf), y: 118, w: shortsTopHalf * 2, h: 3 },
    topPath,
    feet: { leftCx: r1(legLeft.x + legW / 2), rightCx: r1(legRight.x + legW / 2), cy: 189, rx: footRx },
    hairBack,
    hairDome,
    hairCurtains,
    hairBun,
    bellyBlob: { cx: CX, cy: 110, rx: r1(bellyHalf * 0.72), ry: r1(lerp(7, 13, f)) },
  };
}
