import { useId } from 'react';
import type { AvatarMood } from '../../utils/body-avatar';
import { getAccessoriesForLevel, type AccessoryId } from '../../utils/accessories';

interface BodyAvatarProps {
  fatLevel: number; // 0..1
  gender: 'male' | 'female';
  mood: AvatarMood;
  size?: number; // rendered height in px
  level?: number; // unlocks accessories; omit for a bare avatar
}

interface SilhouetteGeometry {
  torsoPath: string;
  armLeftX: number;
  armRightX: number;
  armWidth: number;
  thighY: number;
  thighRx: number;
  armFatY: number;
  armFatRx: number;
}

const GEOMETRY: Record<'male' | 'female', SilhouetteGeometry> = {
  male: {
    // broad shoulders, straighter hips
    torsoPath: 'M34,46 Q60,38 86,46 L82,95 Q82,120 76,124 L44,124 Q38,120 38,95 Z',
    armLeftX: 22,
    armRightX: 87,
    armWidth: 11,
    thighY: 138,
    thighRx: 11,
    armFatY: 74,
    armFatRx: 7,
  },
  female: {
    // narrower shoulders, waist that widens into the hips
    torsoPath: 'M38,46 Q60,38 82,46 L78,86 Q87,110 82,124 L38,124 Q33,110 42,86 Z',
    armLeftX: 26,
    armRightX: 84,
    armWidth: 10,
    thighY: 136,
    thighRx: 13,
    armFatY: 72,
    armFatRx: 6,
  },
};

/** The body outline shapes, reused for the fill pass, the clipPath, and the stroke pass. */
function SilhouetteShapes({ geo }: { geo: SilhouetteGeometry }) {
  return (
    <>
      <rect x={41} y={116} width={16} height={78} rx={8} />
      <rect x={63} y={116} width={16} height={78} rx={8} />
      <rect x={geo.armLeftX} y={46} width={geo.armWidth} height={68} rx={geo.armWidth / 2} />
      <rect x={geo.armRightX} y={46} width={geo.armWidth} height={68} rx={geo.armWidth / 2} />
      <path d={geo.torsoPath} />
      <circle cx={60} cy={25} r={13} />
    </>
  );
}

/** Level-unlocked gear drawn on top of the avatar. */
function Accessory({ id, geo }: { id: AccessoryId; geo: SilhouetteGeometry }) {
  switch (id) {
    case 'wristband':
      return (
        <rect
          x={geo.armLeftX - 0.5}
          y={100}
          width={geo.armWidth + 1}
          height={5}
          rx={2.5}
          className="fill-teal-500 dark:fill-teal-400"
        />
      );
    case 'cap':
      return (
        <g className="fill-red-500 dark:fill-red-400">
          <path d="M47,17 A13,10 0 0 1 73,17 Z" />
          <path d="M71,16 Q82,14.5 85,18 Q78,20.5 70,19 Z" />
        </g>
      );
    case 'sunglasses':
      return (
        <g className="fill-gray-900 dark:fill-black">
          <rect x={49.5} y={18} width={9} height={6} rx={2} />
          <rect x={61.5} y={18} width={9} height={6} rx={2} />
          <path
            d="M58.5,20.5 H61.5 M49.5,20.5 L47.3,19.5 M70.5,20.5 L72.7,19.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            className="text-gray-900 dark:text-black"
          />
        </g>
      );
    case 'medal':
      return (
        <g>
          <path d="M54,44 L60,56 L66,44 Z" className="fill-rose-600 dark:fill-rose-500" />
          <circle cx={60} cy={58} r={4.5} className="fill-amber-400 dark:fill-amber-300" />
          <circle cx={60} cy={58} r={2} className="fill-amber-600 dark:fill-amber-500" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M48,16 L48,7 L53,12 L60,4 L67,12 L72,7 L72,16 Z"
            className="fill-yellow-400 dark:fill-yellow-500"
          />
          <circle cx={53} cy={14.5} r={1.3} className="fill-rose-500" />
          <circle cx={60} cy={14.5} r={1.3} className="fill-rose-500" />
          <circle cx={67} cy={14.5} r={1.3} className="fill-rose-500" />
        </g>
      );
  }
}

/**
 * Cartoon body avatar: a fixed silhouette with yellow "fat" blobs
 * clipped inside it. Each blob scales around its own anchor with
 * fatLevel, so losing weight reads as the fat melting away.
 */
export function BodyAvatar({ fatLevel, gender, mood, size = 160, level }: BodyAvatarProps) {
  const clipId = useId();
  const geo = GEOMETRY[gender];
  const accessories = level !== undefined ? getAccessoriesForLevel(level) : [];
  const fat = Math.min(1, Math.max(0, fatLevel));

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transition = reduceMotion ? undefined : 'transform 700ms ease, opacity 700ms ease';

  // Scale for a blob whose minimum (lean) size is `min` of its full size
  const s = (min: number) => min + (1 - min) * fat;
  const blob = (cx: number, cy: number, rx: number, ry: number, min: number, opacity = 1) => (
    <g style={{ transform: `scale(${s(min)})`, transformOrigin: `${cx}px ${cy}px`, transition, opacity }}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 200"
      width={size * 0.6}
      height={size}
      role="img"
      aria-label={`Body avatar with fat level at ${Math.round(fat * 100)} percent`}
    >
      {/* Body fill */}
      <g className="fill-amber-100 dark:fill-amber-200/90">
        <SilhouetteShapes geo={geo} />
      </g>

      <clipPath id={clipId}>
        <SilhouetteShapes geo={geo} />
      </clipPath>

      {/* Fat layer — clipped so blobs never escape the outline */}
      <g clipPath={`url(#${clipId})`} className="fill-yellow-400/75 dark:fill-yellow-500/70">
        {blob(60, 100, 25, 19, 0.15)}
        {blob(49, geo.thighY, geo.thighRx, 20, 0.3)}
        {blob(71, geo.thighY, geo.thighRx, 20, 0.3)}
        {blob(geo.armLeftX + geo.armWidth / 2, geo.armFatY, geo.armFatRx, 15, 0.35)}
        {blob(geo.armRightX + geo.armWidth / 2, geo.armFatY, geo.armFatRx, 15, 0.35)}
        {/* double chin fades out entirely below ~35% */}
        {blob(60, 37, 8, 5, 0.2, fat > 0.35 ? 1 : 0)}
      </g>

      {/* Outline pass on top of the fat */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="text-gray-700 dark:text-gray-400"
      >
        <SilhouetteShapes geo={geo} />
      </g>

      {/* Face */}
      <g className="fill-gray-700 dark:fill-gray-800">
        <circle cx={54.5} cy={21} r={1.7} />
        <circle cx={65.5} cy={21} r={1.7} />
      </g>
      {mood === 'joy' && (
        <g className="fill-rose-300/80">
          <circle cx={47} cy={26} r={2.5} />
          <circle cx={73} cy={26} r={2.5} />
        </g>
      )}
      {mood === 'joy' ? (
        <path d="M53,27 Q60,35 67,27 Z" className="fill-gray-700 dark:fill-gray-800" />
      ) : (
        <path
          d={mood === 'smile' ? 'M53.5,27 Q60,32.5 66.5,27' : 'M54.5,28 Q60,30.5 65.5,28'}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="text-gray-700 dark:text-gray-800"
        />
      )}

      {/* Level-unlocked accessories, drawn last so they sit over the face */}
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
