import { useId } from 'react';
import type { AvatarMood } from '../../utils/body-avatar';
import { getAccessoriesForLevel, type AccessoryId } from '../../utils/accessories';
import {
  buildAvatarGeometry, AVATAR_VIEWBOX, AVATAR_ASPECT, HEAD_CY, HEAD_RY, EYE_Y, EYE_DX,
  type AvatarGeometry, type AvatarCapsule,
} from './body-avatar-geometry';

interface BodyAvatarProps {
  fatLevel: number; // 0..1
  gender: 'male' | 'female';
  mood: AvatarMood;
  size?: number; // rendered height in px
  level?: number; // unlocks accessories; omit for a bare avatar
}

const CX = 70;

function Rect({ c }: { c: AvatarCapsule }) {
  return <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={c.rx} transform={c.transform} />;
}

/**
 * The full skin silhouette, reused for the fill pass, the clipPath, and
 * the stroke pass. The jaw ellipse (chubby cheeks) is excluded from the
 * outline pass — its stroke would draw an arc across the face.
 */
function SilhouetteShapes({ geo, outline = false }: { geo: AvatarGeometry; outline?: boolean }) {
  return (
    <>
      <Rect c={geo.legLeft} />
      <Rect c={geo.legRight} />
      <Rect c={geo.armLeft} />
      <Rect c={geo.armRight} />
      <Rect c={geo.neck} />
      <path d={geo.torsoPath} />
      {!outline && <ellipse cx={CX} cy={66} rx={geo.jawRx} ry={geo.jawRy} />}
      <ellipse cx={CX} cy={HEAD_CY} rx={geo.headRx} ry={HEAD_RY} />
    </>
  );
}

/** Level-unlocked gear, drawn last so it sits over hair and clothes. */
function Accessory({ id, geo }: { id: AccessoryId; geo: AvatarGeometry }) {
  switch (id) {
    case 'wristband':
      return (
        <g transform={geo.armLeft.transform}>
          <rect
            x={geo.armLeft.x - 0.5}
            y={114}
            width={geo.armLeft.w + 1}
            height={5}
            rx={2.5}
            className="fill-teal-500 dark:fill-teal-400"
          />
        </g>
      );
    case 'cap': {
      const capHalf = geo.headRx * 0.93;
      return (
        <g className="fill-red-500 dark:fill-red-400">
          <path d={`M ${CX - capHalf},34 A ${capHalf} 26 0 0 1 ${CX + capHalf},34 Z`} />
          <path d={`M ${CX + capHalf - 3},31 Q ${CX + capHalf + 11},29 ${CX + capHalf + 15},34 Q ${CX + capHalf + 5},37 ${CX + capHalf - 5},35 Z`} />
        </g>
      );
    }
    case 'sunglasses':
      return (
        <g className="fill-gray-900 dark:fill-black">
          <rect x={53} y={46} width={13} height={9} rx={3} />
          <rect x={74} y={46} width={13} height={9} rx={3} />
          <path
            d={`M 66,50 H 74 M 53,50 L ${CX - geo.headRx - 1},47 M 87,50 L ${CX + geo.headRx + 1},47`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-gray-900 dark:text-black"
          />
        </g>
      );
    case 'medal':
      return (
        <g>
          <path d="M 62,80 L 70,96 L 78,80 Z" className="fill-rose-600 dark:fill-rose-500" />
          <circle cx={70} cy={99} r={5.5} className="fill-amber-400 dark:fill-amber-300" />
          <circle cx={70} cy={99} r={2.5} className="fill-amber-600 dark:fill-amber-500" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M 54,20 L 54,6 L 62,13 L 70,2 L 78,13 L 86,6 L 86,20 Z"
            className="fill-yellow-400 dark:fill-yellow-500"
          />
          <circle cx={62} cy={17} r={1.6} className="fill-rose-500" />
          <circle cx={70} cy={17} r={1.6} className="fill-rose-500" />
          <circle cx={78} cy={17} r={1.6} className="fill-rose-500" />
        </g>
      );
  }
}

/**
 * Chibi body avatar whose whole silhouette morphs with fatLevel —
 * belly, waist, hips, cheeks and limbs all widen as fat increases —
 * with a yellow visceral-fat blob layered inside the bare belly.
 */
export function BodyAvatar({ fatLevel, gender, mood, size = 160, level }: BodyAvatarProps) {
  const clipId = useId();
  const geo = buildAvatarGeometry(fatLevel, gender);
  const accessories = level !== undefined ? getAccessoriesForLevel(level) : [];
  const fat = Math.min(1, Math.max(0, fatLevel));

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transition = reduceMotion ? undefined : 'transform 700ms ease, opacity 700ms ease';

  // Scale for a fat blob whose minimum (lean) size is `min` of its full size
  const s = (min: number) => min + (1 - min) * fat;
  const blob = (b: { cx: number; cy: number; rx: number; ry: number }, min: number, opacity = 1) => (
    <g style={{ transform: `scale(${s(min)})`, transformOrigin: `${b.cx}px ${b.cy}px`, transition, opacity }}>
      <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} />
    </g>
  );

  const outlineClass = 'text-gray-800 dark:text-gray-300';
  const hairClass = gender === 'male' ? 'fill-amber-950 dark:fill-amber-900' : 'fill-amber-800 dark:fill-amber-700';

  return (
    <svg
      viewBox={AVATAR_VIEWBOX}
      width={size * AVATAR_ASPECT}
      height={size}
      role="img"
      aria-label={`Body avatar with fat level at ${Math.round(fat * 100)} percent`}
    >
      {/* Skin fill — peachy, clearly distinct from the yellow fat layer */}
      <g className="fill-orange-200 dark:fill-orange-300/90">
        <SilhouetteShapes geo={geo} />
      </g>

      <clipPath id={clipId}>
        <SilhouetteShapes geo={geo} />
      </clipPath>

      {/* Visceral fat layer — clipped inside the (already morphing) body */}
      <g clipPath={`url(#${clipId})`} className="fill-yellow-400/75 dark:fill-yellow-500/70">
        {blob(geo.bellyBlob, 0.12)}
        {blob(geo.thighBlobs[0], 0.3)}
        {blob(geo.thighBlobs[1], 0.3)}
      </g>

      {/* Workout clothes, computed from the same geometry so they track the morph */}
      {geo.topPath && (
        <g className="fill-rose-400 dark:fill-rose-400">
          <path d={geo.topPath} />
          <rect x={CX - 12} y={76} width={4} height={8} rx={1.5} />
          <rect x={CX + 8} y={76} width={4} height={8} rx={1.5} />
        </g>
      )}
      <path d={geo.shortsPath} className="fill-brand-600 dark:fill-brand-500" />
      <rect {...geo.waistband} className="fill-brand-800/60 dark:fill-brand-900/60" />
      <g className="fill-white dark:fill-gray-200" stroke="currentColor" strokeWidth={1.5}>
        <ellipse cx={geo.feet.leftCx} cy={geo.feet.cy} rx={geo.feet.rx} ry={6} className={`${outlineClass} fill-white dark:fill-gray-200`} />
        <ellipse cx={geo.feet.rightCx} cy={geo.feet.cy} rx={geo.feet.rx} ry={6} className={`${outlineClass} fill-white dark:fill-gray-200`} />
      </g>

      {/* Outline pass */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={outlineClass}
      >
        <SilhouetteShapes geo={geo} outline />
      </g>

      {/* Hair — hats and crowns draw over it */}
      <g className={hairClass} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
        {geo.hairBun && <circle cx={geo.hairBun.cx} cy={geo.hairBun.cy} r={geo.hairBun.r} />}
        <path d={geo.hairDome} />
        {geo.hairCurtains?.map((d) => <path key={d} d={d} />)}
      </g>

      {/* Chibi face */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        className="text-gray-800 dark:text-gray-900"
      >
        <path d={`M ${CX - EYE_DX - 4},42 Q ${CX - EYE_DX},40 ${CX - EYE_DX + 4},42`} />
        <path d={`M ${CX + EYE_DX - 4},42 Q ${CX + EYE_DX},40 ${CX + EYE_DX + 4},42`} />
      </g>
      <g className="fill-gray-800 dark:fill-gray-900">
        <circle cx={CX - EYE_DX} cy={EYE_Y} r={3.2} />
        <circle cx={CX + EYE_DX} cy={EYE_Y} r={3.2} />
      </g>
      <g className="fill-white">
        <circle cx={CX - EYE_DX + 1.2} cy={EYE_Y - 1.2} r={1.1} />
        <circle cx={CX + EYE_DX + 1.2} cy={EYE_Y - 1.2} r={1.1} />
      </g>
      <g className="fill-rose-300" opacity={mood === 'joy' ? 0.9 : 0.6}>
        <ellipse cx={CX - 17} cy={57} rx={3.5} ry={2} />
        <ellipse cx={CX + 17} cy={57} rx={3.5} ry={2} />
      </g>
      {mood === 'joy' ? (
        <g>
          <path d={`M ${CX - 8},59 Q ${CX},69 ${CX + 8},59 Z`} className="fill-gray-800 dark:fill-gray-900" />
          <path d={`M ${CX - 4},64 Q ${CX},67 ${CX + 4},64 Z`} className="fill-rose-400" />
        </g>
      ) : (
        <path
          d={mood === 'smile' ? `M ${CX - 7},59 Q ${CX},65 ${CX + 7},59` : `M ${CX - 5},60 Q ${CX},62 ${CX + 5},60`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="text-gray-800 dark:text-gray-900"
        />
      )}

      {/* Level-unlocked accessories */}
      {accessories.length > 0 && (
        <g data-testid="avatar-accessories">
          {accessories.map((id) => (
            <Accessory key={id} id={id} geo={geo} />
          ))}
        </g>
      )}
    </svg>
  );
}
