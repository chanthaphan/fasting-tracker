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
  muscle?: number; // 0..1 training bulk; combined with leanness it reveals definition
  size?: number; // rendered height in px
  level?: number; // unlocks accessories; omit for a bare avatar
}

const CX = 70;

const INK = '#1f2937';
const SKIN = '#f9cba6';
const SKIN_SHADE = '#c98a5e';
const SKIN_LIGHT = '#fde8d3';
const BLUSH = '#f9a3ad';
const SHORTS = '#0d9488';
const SHORTS_DARK = '#0f766e';
const TOP = '#fb7185';
const SHOE = '#374151';
const SHOE_SOLE = '#f3f4f6';

const HAIR = {
  male: { base: '#4a2c1b', shine: '#7a4a2c' },
  female: { base: '#8a4b26', shine: '#c47a45' },
};

/** A stroke painted underneath the fill, so only the outer half of it shows. */
const OUTLINE = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' } as const;

function Rect({ c }: { c: AvatarCapsule }) {
  return <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={c.rx} transform={c.transform} />;
}

/**
 * The full skin silhouette. Drawn once dilated in ink and once in skin on
 * top, which yields a single clean outline around the union of the parts
 * with no seams where limbs meet the torso.
 */
function SilhouetteShapes({ geo }: { geo: AvatarGeometry }) {
  return (
    <>
      <Rect c={geo.legLeft} />
      <Rect c={geo.legRight} />
      <Rect c={geo.armLeft} />
      <Rect c={geo.armRight} />
      {geo.biceps.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} transform={b.transform} />
      ))}
      <Rect c={geo.neck} />
      <path d={geo.torsoPath} />
      <ellipse cx={CX} cy={66} rx={geo.jawRx} ry={geo.jawRy} />
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
            fill="#14b8a6"
            {...OUTLINE}
            strokeWidth={2}
          />
        </g>
      );
    case 'cap': {
      const capHalf = geo.headRx * 0.95;
      return (
        <g fill="#ef4444" {...OUTLINE}>
          <path d={`M ${CX - capHalf},34 A ${capHalf} 27 0 0 1 ${CX + capHalf},34 Z`} />
          <path d={`M ${CX + capHalf - 3},31 Q ${CX + capHalf + 11},29 ${CX + capHalf + 15},34 Q ${CX + capHalf + 5},37 ${CX + capHalf - 5},35 Z`} />
          <circle cx={CX} cy={8} r={2.2} />
        </g>
      );
    }
    case 'sunglasses':
      return (
        <g fill="#111827">
          <rect x={CX - EYE_DX - 7} y={45} width={14} height={10} rx={3.5} />
          <rect x={CX + EYE_DX - 7} y={45} width={14} height={10} rx={3.5} />
          <path
            d={`M ${CX - EYE_DX + 7},49 H ${CX + EYE_DX - 7} M ${CX - EYE_DX - 7},49 L ${CX - geo.headRx - 1},46 M ${CX + EYE_DX + 7},49 L ${CX + geo.headRx + 1},46`}
            fill="none"
            stroke="#111827"
            strokeWidth={1.6}
          />
          <rect x={CX - EYE_DX - 4} y={47} width={4} height={2} rx={1} fill="#9ca3af" opacity={0.7} />
          <rect x={CX + EYE_DX - 4} y={47} width={4} height={2} rx={1} fill="#9ca3af" opacity={0.7} />
        </g>
      );
    case 'medal':
      return (
        <g>
          <path d="M 63,79 L 70,95 L 77,79 Z" fill="#e11d48" {...OUTLINE} strokeWidth={2} />
          <circle cx={70} cy={99} r={5.5} fill="#fbbf24" {...OUTLINE} strokeWidth={2} />
          <circle cx={70} cy={99} r={2.5} fill="#d97706" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M 54,20 L 54,6 L 62,13 L 70,2 L 78,13 L 86,6 L 86,20 Z"
            fill="#facc15"
            {...OUTLINE}
          />
          <circle cx={62} cy={17} r={1.6} fill="#f43f5e" />
          <circle cx={70} cy={17} r={1.6} fill="#f43f5e" />
          <circle cx={78} cy={17} r={1.6} fill="#f43f5e" />
        </g>
      );
  }
}

/** Mirrored short arc, used for pec lines and ab rows. */
function AbRow({ y, halfW }: { y: number; halfW: number }) {
  return (
    <>
      <path d={`M ${CX - halfW},${y} Q ${CX - halfW / 2},${y + 2.2} ${CX - 1.5},${y}`} />
      <path d={`M ${CX + 1.5},${y} Q ${CX + halfW / 2},${y + 2.2} ${CX + halfW},${y}`} />
    </>
  );
}

/**
 * Chibi body avatar whose whole silhouette morphs with fatLevel —
 * belly, waist, hips, cheeks and limbs all widen as fat increases —
 * with soft shading so the body reads as round rather than flat.
 * Muscle adds bulk to the silhouette, and once the body is lean enough
 * the definition shows: pecs, a six-pack, shoulder and bicep highlights.
 */
export function BodyAvatar({ fatLevel, gender, mood, muscle = 0, size = 160, level }: BodyAvatarProps) {
  const clipId = useId();
  const fat = Math.min(1, Math.max(0, fatLevel));
  const bulk = Math.min(1, Math.max(0, muscle));
  const geo = buildAvatarGeometry(fat, gender, bulk);
  const accessories = level !== undefined ? getAccessoriesForLevel(level) : [];
  const hair = HAIR[gender];
  const belly = geo.bellyBlob;
  // Abs and pecs only show through when lean; training makes them pop
  const definition = Math.pow(1 - fat, 1.6) * (0.35 + 0.65 * bulk);
  const absHalf = Math.max(6, geo.waistHalf * 0.55);

  return (
    <svg
      viewBox={AVATAR_VIEWBOX}
      width={size * AVATAR_ASPECT}
      height={size}
      role="img"
      aria-label={`Body avatar with fat level at ${Math.round(fat * 100)} percent and muscle at ${Math.round(bulk * 100)} percent`}
    >
      <clipPath id={clipId}>
        <SilhouetteShapes geo={geo} />
      </clipPath>
      <radialGradient id={`${clipId}-glow`}>
        <stop offset="0%" stopColor={SKIN_LIGHT} stopOpacity={0.9} />
        <stop offset="100%" stopColor={SKIN_LIGHT} stopOpacity={0} />
      </radialGradient>

      {/* Ground shadow */}
      <ellipse
        cx={CX}
        cy={194}
        rx={geo.hipHalf + 14}
        ry={3.5}
        className="fill-gray-900/10 dark:fill-white/10"
      />

      {/* Hair volume behind the head (female bob) */}
      {geo.hairBack && <path d={geo.hairBack} fill={hair.base} {...OUTLINE} />}

      {/* Body: ink dilation, then skin */}
      <g fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round">
        <SilhouetteShapes geo={geo} />
      </g>
      <g fill={SKIN}>
        <SilhouetteShapes geo={geo} />
      </g>

      {/* Skin shading, clipped inside the body */}
      <g clipPath={`url(#${clipId})`}>
        {/* Shadow cast by the chin onto the neck and chest */}
        <ellipse cx={CX} cy={72} rx={geo.jawRx + 4} ry={7} fill={SKIN_SHADE} opacity={0.28} />
        {/* Belly roundness: highlight above, crease below, both grow with fat */}
        <ellipse
          cx={belly.cx}
          cy={belly.cy - belly.ry * 0.35}
          rx={belly.rx * 0.8}
          ry={belly.ry * 0.7}
          fill={`url(#${clipId}-glow)`}
          opacity={(0.3 + 0.5 * fat) * (1 - 0.7 * definition)}
        />
        <path
          d={`M ${CX - belly.rx},${belly.cy + belly.ry - 1} Q ${CX},${belly.cy + belly.ry + 5} ${CX + belly.rx},${belly.cy + belly.ry - 1}`}
          fill="none"
          stroke={SKIN_SHADE}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.15 + 0.4 * fat}
        />
        {/* Inner-leg shadow keeps the legs from reading as one block */}
        <rect x={CX - 1.5} y={128} width={3} height={58} fill={SKIN_SHADE} opacity={0.18} />

        {/* Muscle definition: highlights on delts, pecs and biceps */}
        <g fill={SKIN_LIGHT} opacity={0.55 * bulk}>
          <ellipse cx={CX - geo.shoulderHalf + 3} cy={84} rx={5.5} ry={3.2} />
          <ellipse cx={CX + geo.shoulderHalf - 3} cy={84} rx={5.5} ry={3.2} />
          {geo.biceps.map((b, i) => (
            <ellipse key={i} cx={b.cx - 1} cy={b.cy - 3} rx={b.rx * 0.45} ry={4} transform={b.transform} />
          ))}
        </g>
        <g fill={SKIN_LIGHT} opacity={0.45 * definition}>
          <ellipse cx={CX - 9} cy={88} rx={7} ry={3.5} />
          <ellipse cx={CX + 9} cy={88} rx={7} ry={3.5} />
        </g>
        {/* Pec lines and six-pack, drawn under the clothes so a top covers the chest */}
        <g fill="none" stroke={SKIN_SHADE} strokeWidth={1.7} strokeLinecap="round" opacity={0.85 * definition}>
          <path d={`M ${CX - 16},92 Q ${CX - 8},98 ${CX - 2},93`} />
          <path d={`M ${CX + 16},92 Q ${CX + 8},98 ${CX + 2},93`} />
          <path d={`M ${CX},97 L ${CX},${belly.cy + 6}`} strokeWidth={1.4} />
          {[100, 106, 112].map((y) => (
            <AbRow key={y} y={y} halfW={absHalf} />
          ))}
        </g>
        {/* Bicep crease */}
        <g fill="none" stroke={SKIN_SHADE} strokeWidth={1.4} strokeLinecap="round" opacity={0.6 * bulk}>
          {geo.biceps.map((b, i) => (
            <path key={i} d={`M ${b.cx - b.rx * 0.7},${b.cy + 6} Q ${b.cx},${b.cy + 9} ${b.cx + b.rx * 0.7},${b.cy + 6}`} transform={b.transform} />
          ))}
        </g>
      </g>

      {/* Navel */}
      <path
        d={`M ${CX - 1.8},${belly.cy + 2} Q ${CX},${belly.cy + 4.5} ${CX + 1.8},${belly.cy + 2}`}
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Workout clothes, computed from the same geometry so they track the morph */}
      {geo.topPath && (
        <g fill={TOP} {...OUTLINE}>
          <rect x={CX - 12} y={75} width={4} height={9} rx={1.5} />
          <rect x={CX + 8} y={75} width={4} height={9} rx={1.5} />
          <path d={geo.topPath} />
        </g>
      )}
      <path d={geo.shortsPath} fill={SHORTS} {...OUTLINE} />
      <rect {...geo.waistband} fill={SHORTS_DARK} />
      {/* Side stripe on the shorts */}
      <path
        d={`M ${CX + geo.hipHalf - 2},122 Q ${CX + geo.hipHalf},134 ${CX + geo.hipHalf - 3},144`}
        fill="none"
        stroke="#fff"
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Sneakers: pale sole under a dark upper */}
      {[geo.feet.leftCx, geo.feet.rightCx].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={geo.feet.cy + 2} rx={geo.feet.rx + 0.5} ry={4.5} fill={SHOE_SOLE} {...OUTLINE} strokeWidth={2.5} />
          <ellipse cx={cx} cy={geo.feet.cy - 1} rx={geo.feet.rx} ry={5.5} fill={SHOE} {...OUTLINE} strokeWidth={2.5} />
          <path
            d={`M ${cx - geo.feet.rx * 0.6},${geo.feet.cy + 0.5} Q ${cx},${geo.feet.cy + 3.5} ${cx + geo.feet.rx * 0.6},${geo.feet.cy + 0.5}`}
            fill="none"
            stroke={SHOE_SOLE}
            strokeWidth={1.2}
          />
        </g>
      ))}

      {/* Hair — hats and crowns draw over it */}
      <g fill={hair.base} {...OUTLINE}>
        {geo.hairBun && <circle cx={geo.hairBun.cx} cy={geo.hairBun.cy} r={geo.hairBun.r} />}
        {geo.hairCurtains?.map((d) => <path key={d} d={d} />)}
        <path d={geo.hairDome} />
      </g>
      {/* Hair shine */}
      <path
        d={`M ${CX - 14},22 Q ${CX - 6},16 ${CX + 4},18`}
        fill="none"
        stroke={hair.shine}
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Chibi face */}
      <g fill={BLUSH} opacity={mood === 'joy' ? 0.85 : 0.55}>
        <ellipse cx={CX - 17} cy={57} rx={4.5} ry={2.5} />
        <ellipse cx={CX + 17} cy={57} rx={4.5} ry={2.5} />
      </g>
      {/* Brows */}
      <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round">
        <path d={`M ${CX - EYE_DX - 4},${mood === 'joy' ? 39 : 41} Q ${CX - EYE_DX},${mood === 'joy' ? 37 : 39} ${CX - EYE_DX + 4},${mood === 'joy' ? 39 : 41}`} />
        <path d={`M ${CX + EYE_DX - 4},${mood === 'joy' ? 39 : 41} Q ${CX + EYE_DX},${mood === 'joy' ? 37 : 39} ${CX + EYE_DX + 4},${mood === 'joy' ? 39 : 41}`} />
      </g>
      {mood === 'joy' ? (
        // Happy closed eyes
        <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round">
          <path d={`M ${CX - EYE_DX - 4.5},${EYE_Y + 1} Q ${CX - EYE_DX},${EYE_Y - 5} ${CX - EYE_DX + 4.5},${EYE_Y + 1}`} />
          <path d={`M ${CX + EYE_DX - 4.5},${EYE_Y + 1} Q ${CX + EYE_DX},${EYE_Y - 5} ${CX + EYE_DX + 4.5},${EYE_Y + 1}`} />
        </g>
      ) : (
        <g>
          <g fill={INK}>
            <ellipse cx={CX - EYE_DX} cy={EYE_Y} rx={3.6} ry={4.4} />
            <ellipse cx={CX + EYE_DX} cy={EYE_Y} rx={3.6} ry={4.4} />
          </g>
          <g fill="#fff">
            <circle cx={CX - EYE_DX + 1.3} cy={EYE_Y - 1.6} r={1.4} />
            <circle cx={CX + EYE_DX + 1.3} cy={EYE_Y - 1.6} r={1.4} />
            <circle cx={CX - EYE_DX - 1.2} cy={EYE_Y + 1.8} r={0.7} />
            <circle cx={CX + EYE_DX - 1.2} cy={EYE_Y + 1.8} r={0.7} />
          </g>
        </g>
      )}
      {mood === 'joy' ? (
        <g>
          <path d={`M ${CX - 8},59 Q ${CX},70 ${CX + 8},59 Z`} fill={INK} />
          <path d={`M ${CX - 4.5},64 Q ${CX},68 ${CX + 4.5},64 Z`} fill="#fb7185" />
        </g>
      ) : (
        <path
          d={mood === 'smile' ? `M ${CX - 6},59 Q ${CX},65 ${CX + 6},59` : `M ${CX - 4},60.5 Q ${CX},62 ${CX + 4},60.5`}
          fill="none"
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
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
