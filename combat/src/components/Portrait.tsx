import { memo, useMemo } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { RIVAL_ID_BY_NAME } from '@/game/rivals';
import { mixHex, portraitSpec, type FaceShape, type PortraitSpec } from '@/ui/portrait';
import { colors } from '@/ui/theme';

interface Props {
  /** Сид генератора — имя бойца. */
  seed: string;
  /** Именной соперник: черты из таблицы `RIVAL_PORTRAITS`. */
  rivalId?: string;
  size: number;
  /** Доля здоровья 0..1: ниже половины боец бледнеет и уходит в тень, ниже трети — кровь. */
  hpRatio?: number;
  /** Травма — повязка через лоб. */
  injured?: boolean;
  /** Тёмный круг света за головой (для карточек; в рамке аватара свет уже есть). */
  backdrop?: boolean;
  /** Плотный кадр: только лицо, без плеч — для маленьких квадратных карточек. */
  tight?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Вся геометрия — в координатах viewBox 0 0 100 110, голова по центру x=50.
const W = 100;
const H = 110;
const CX = 50;

interface FaceGeom {
  fw: number; // полуширина лба
  cw: number; // полуширина на скулах
  jw: number; // полуширина челюсти
  chin: number; // полуширина подбородка
  top: number;
  bottom: number;
}

const FACES: Record<FaceShape, FaceGeom> = {
  oval: { fw: 29, cw: 32, jw: 22, chin: 9, top: 12, bottom: 78 },
  square: { fw: 31, cw: 32, jw: 28, chin: 15, top: 14, bottom: 78 },
  long: { fw: 27, cw: 29, jw: 21, chin: 8, top: 9, bottom: 82 },
  round: { fw: 31, cw: 34, jw: 27, chin: 13, top: 14, bottom: 76 },
  gaunt: { fw: 30, cw: 29, jw: 20, chin: 5, top: 12, bottom: 80 },
};

type Cubic = [number, number, number, number, number, number];

/** Внешний контур капюшона: от макушки до плеч. */
const HOOD_OUTER = `M 2 ${H} C 4 90 12 76 20 60 C 24 46 26 26 36 12 C 42 4 58 4 64 12 C 74 26 76 46 80 60 C 88 76 96 90 98 ${H} Z`;

/** Симметричный контур: правая половина кубиками сверху вниз, левая достраивается зеркально. */
function symmetric(topY: number, segs: Cubic[], closeY?: number): string {
  let d = `M ${CX} ${topY}`;
  for (const [c1x, c1y, c2x, c2y, x, y] of segs) d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`;
  const last = segs[segs.length - 1];
  const lx = CX - (last[4] - CX);
  d += closeY === undefined ? ` L ${lx} ${last[5]}` : ` L ${last[4]} ${closeY} L ${lx} ${closeY} L ${lx} ${last[5]}`;
  for (let i = segs.length - 1; i >= 0; i -= 1) {
    const [c1x, c1y, c2x, c2y] = segs[i];
    const prevX = i === 0 ? CX : segs[i - 1][4];
    const prevY = i === 0 ? topY : segs[i - 1][5];
    d += ` C ${CX - (c2x - CX)} ${c2y} ${CX - (c1x - CX)} ${c1y} ${CX - (prevX - CX)} ${prevY}`;
  }
  return `${d} Z`;
}

function headSegs(f: FaceGeom, grow = 0): Cubic[] {
  const fw = f.fw + grow;
  const cw = f.cw + grow;
  const jw = f.jw + grow;
  const chin = f.chin + grow * 0.6;
  const bottom = f.bottom + grow;
  return [
    [CX + fw * 0.75, f.top - grow, CX + fw, f.top + 8, CX + fw, 34],
    [CX + fw, 41, CX + cw, 44, CX + cw, 50],
    [CX + cw, 58, CX + jw + 3, 64, CX + jw, 68],
    [CX + jw - 2, 74, CX + chin + 5, bottom, CX + chin, bottom],
  ];
}

function headPath(f: FaceGeom, grow = 0): string {
  return symmetric(f.top - grow, headSegs(f, grow));
}

/** Овал лица, оставленный открытым капюшоном, платком, подшлемником. */
function faceOpening(f: FaceGeom, fromY: number): string {
  const cw = f.cw - 2;
  return symmetric(fromY, [
    [CX + cw * 0.7, fromY, CX + cw, fromY + 10, CX + cw, 50],
    [CX + cw, 60, CX + f.jw, 70, CX + f.chin + 2, f.bottom - 1],
  ]);
}

export const Portrait = memo(function Portrait({ seed, rivalId, size, hpRatio = 1, injured = false, backdrop = false, tight = false, style }: Props) {
  // Именного соперника узнаём и по имени: в общем списке имён те же «Мясник» и «Тень».
  const spec = portraitSpec(seed, rivalId ?? RIVAL_ID_BY_NAME[seed]);
  // Здоровье округляем до двадцатых — иначе каждое очко hp перерисовывает портрет.
  const hp = Math.max(0, Math.min(1, Math.round(hpRatio * 20) / 20));
  const clipId = useMemo(() => `pt${Math.abs(seed.length * 7919 + (rivalId?.length ?? 0))}-${seed.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`, [seed, rivalId]);
  const body = useMemo(() => render(spec, hp, injured, backdrop, clipId), [spec, hp, injured, backdrop, clipId]);
  if (tight) {
    return (
      <Svg width={size} height={size} viewBox="12 6 76 76" style={style}>
        {body}
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size * (H / W)} viewBox={`0 0 ${W} ${H}`} style={style}>
      {body}
    </Svg>
  );
});

function render(s: PortraitSpec, hp: number, injured: boolean, backdrop: boolean, clipId: string) {
  const f = FACES[s.face];
  // Чем меньше здоровья, тем бледнее кожа и глубже тень.
  const fade = Math.max(0, Math.min(1, (0.55 - hp) / 0.55));
  const skin = mixHex(s.skin, '#9b9a94', fade * 0.55);
  const skinDark = mixHex(skin, '#1a120c', 0.28);
  const skinDeep = mixHex(skin, '#1a120c', 0.45);
  const hairDark = mixHex(s.hairColor, '#000000', 0.35);
  const clothDark = mixHex(s.cloth, '#000000', 0.35);
  const clothLight = mixHex(s.cloth, '#f0e6d2', 0.12);
  const head = headPath(f);
  const old = s.age === 'old';
  const hidden = s.eyes === 'hidden';
  const bleeding = hp < 0.35;

  const nodes: React.ReactNode[] = [];
  const push = (n: React.ReactNode) => nodes.push(n);

  push(
    <Defs key="defs">
      <ClipPath id={clipId}>
        <Path d={head} />
      </ClipPath>
    </Defs>,
  );

  if (backdrop) {
    push(<Ellipse key="bd1" cx={CX} cy={56} rx={44} ry={50} fill={colors.cardAlt} opacity={0.9} />);
    push(<Ellipse key="bd2" cx={CX - 6} cy={40} rx={30} ry={34} fill={colors.borderStrong} opacity={0.22} />);
  }

  // --- Волосы сзади (длинные) и задняя часть платка/капюшона — под головой.
  if (s.hair === 'long') {
    push(
      <Path
        key="hairBack"
        d={symmetric(f.top - 5, [
          [CX + f.fw + 2, f.top - 5, CX + f.cw + 6, 30, CX + f.cw + 7, 55],
          [CX + f.cw + 8, 75, CX + f.cw + 12, 90, CX + f.cw + 6, 98],
        ])}
        fill={hairDark}
      />,
    );
  }

  if (s.hair === 'hood') push(<Path key="hoodBack" d={HOOD_OUTER} fill={clothDark} />);

  // --- Плечи.
  const shoulderPath = `M 4 ${H} C 6 96 14 90 30 86 C 38 84 44 82 50 82 C 56 82 62 84 70 86 C 86 90 94 96 96 ${H} Z`;
  const shoulderFill = s.shoulders === 'mail' ? '#4d5057' : s.shoulders === 'leather' ? mixHex(s.cloth, '#5a3a22', 0.5) : s.cloth;
  push(<Path key="sh" d={shoulderPath} fill={shoulderFill} />);
  push(<Path key="shShade" d={`M 62 84 C 72 86 86 92 96 ${H} L 60 ${H} Z`} fill="#000" opacity={0.22} />);
  if (s.shoulders === 'shirt') {
    push(<Path key="collar" d="M 36 86 L 50 100 L 64 86" stroke={clothDark} strokeWidth={1.6} fill="none" />);
    push(<Path key="collar2" d="M 38 85 C 44 92 56 92 62 85" stroke={clothLight} strokeWidth={0.8} fill="none" opacity={0.5} />);
  } else if (s.shoulders === 'leather') {
    push(<Path key="strap" d={`M 22 ${H} C 30 96 40 90 50 88`} stroke={clothDark} strokeWidth={5} fill="none" />);
    push(<Path key="stitch" d="M 30 86 C 40 84 60 84 70 86" stroke={clothLight} strokeWidth={0.8} strokeDasharray="2 2" fill="none" opacity={0.7} />);
    push(<Circle key="rivet" cx={34} cy={94} r={1.4} fill="#8a7a5a" />);
  } else if (s.shoulders === 'mail') {
    for (let i = 0; i < 4; i += 1) {
      push(<Path key={`mail${i}`} d={`M 10 ${92 + i * 5} C 30 ${86 + i * 5} 70 ${86 + i * 5} 90 ${92 + i * 5}`} stroke="#2b2d31" strokeWidth={1.2} strokeDasharray="1.6 1.4" fill="none" opacity={0.8} />);
    }
    push(<Path key="mailLight" d="M 20 92 C 35 86 65 86 80 92" stroke="#7d8189" strokeWidth={0.9} strokeDasharray="1.6 1.4" fill="none" opacity={0.6} />);
  } else if (s.shoulders === 'cloak') {
    push(<Path key="cloakL" d={`M 4 ${H} C 8 92 20 86 36 84 L 40 ${H} Z`} fill={clothDark} opacity={0.7} />);
    push(<Path key="cloakR" d={`M 96 ${H} C 92 92 80 86 64 84 L 60 ${H} Z`} fill={clothDark} opacity={0.7} />);
    push(<Circle key="clasp" cx={50} cy={97} r={2.4} fill="none" stroke="#9a7c3a" strokeWidth={1.2} />);
  } else if (s.shoulders === 'apron') {
    push(<Path key="apron" d={`M 30 ${H} L 33 92 C 40 90 60 90 67 92 L 70 ${H} Z`} fill="#8a7d66" />);
    push(<Path key="apronShade" d={`M 52 91 C 60 90 66 91 67 92 L 70 ${H} L 54 ${H} Z`} fill="#000" opacity={0.25} />);
    push(<Ellipse key="stain1" cx={44} cy={100} rx={3.5} ry={2} fill="#5a1d17" opacity={0.75} />);
    push(<Ellipse key="stain2" cx={58} cy={105} rx={2.2} ry={3} fill="#5a1d17" opacity={0.6} />);
    push(<Path key="apronStrapL" d="M 34 92 L 40 84" stroke="#5c5141" strokeWidth={1.4} />);
    push(<Path key="apronStrapR" d="M 66 92 L 60 84" stroke="#5c5141" strokeWidth={1.4} />);
  }

  // --- Шея.
  push(<Path key="neck" d={`M ${CX - 9} 64 L ${CX + 9} 64 L ${CX + 10} 86 Q ${CX} 90 ${CX - 10} 86 Z`} fill={skinDark} />);
  push(<Path key="neckShade" d={`M ${CX - 9} 66 Q ${CX} 76 ${CX + 9} 66 L ${CX + 9} 64 L ${CX - 9} 64 Z`} fill="#000" opacity={0.3} />);

  // --- Уши.
  const earY = 49;
  push(<Ellipse key="earL" cx={CX - f.cw - 1} cy={earY} rx={3.6} ry={5.6} fill={skinDark} />);
  push(<Ellipse key="earR" cx={CX + f.cw + 1} cy={earY} rx={3.6} ry={5.6} fill={skinDark} />);
  push(<Ellipse key="earLi" cx={CX - f.cw - 1.5} cy={earY + 0.5} rx={1.8} ry={3.2} fill={skinDeep} />);
  push(<Ellipse key="earRi" cx={CX + f.cw + 1.5} cy={earY + 0.5} rx={1.8} ry={3.2} fill={skinDeep} />);

  // --- Голова: кожа, свет слева, тень справа и под скулами.
  push(<Path key="head" d={head} fill={skin} />);
  push(
    <G key="shade" clipPath={`url(#${clipId})`}>
      <Ellipse cx={CX + 22} cy={50} rx={22} ry={44} fill="#1a120c" opacity={0.22} />
      <Ellipse cx={CX - 12} cy={30} rx={16} ry={14} fill="#fff6e0" opacity={0.07} />
      <Ellipse cx={CX - f.cw + 6} cy={58} rx={7} ry={5} fill="#1a120c" opacity={0.14} />
      <Ellipse cx={CX + f.cw - 6} cy={58} rx={7} ry={5} fill="#1a120c" opacity={0.24} />
      <Ellipse cx={CX} cy={f.top + 4} rx={f.fw} ry={10} fill="#1a120c" opacity={0.12} />
      {hidden ? <Rect x={0} y={0} width={W} height={56} fill="#0d0906" opacity={0.85} /> : null}
    </G>,
  );

  // --- Глазницы, глаза, брови.
  const eyeY = 46;
  const eyeDX = 11;
  if (!hidden) {
    push(<Ellipse key="socketL" cx={CX - eyeDX} cy={eyeY + 1} rx={7} ry={4.5} fill="#1a120c" opacity={old ? 0.28 : 0.16} />);
    push(<Ellipse key="socketR" cx={CX + eyeDX} cy={eyeY + 1} rx={7} ry={4.5} fill="#1a120c" opacity={old ? 0.32 : 0.2} />);
    const narrow = s.eyes === 'narrow';
    const ry = narrow ? 1.4 : 2.4;
    for (const side of [-1, 1] as const) {
      const patched = (side === -1 && s.eyes === 'patch-left') || (side === 1 && s.eyes === 'patch-right');
      const ex = CX + side * eyeDX;
      if (patched) continue;
      push(<Ellipse key={`white${side}`} cx={ex} cy={eyeY} rx={4} ry={ry} fill="#b4ab99" />);
      push(<Circle key={`iris${side}`} cx={ex + 0.5} cy={eyeY + 0.2} r={narrow ? 1.4 : 1.9} fill={s.eyeColor} />);
      push(<Circle key={`pupil${side}`} cx={ex + 0.5} cy={eyeY + 0.2} r={narrow ? 0.6 : 0.9} fill="#0b0806" />);
      push(<Circle key={`glint${side}`} cx={ex - 0.3} cy={eyeY - 0.6} r={0.45} fill="#fff" opacity={0.55} />);
      // Верхнее веко — тяжёлая тёмная дуга, нависает на глаз.
      push(<Path key={`lid${side}`} d={`M ${ex - 4.4} ${eyeY + 0.4} Q ${ex} ${eyeY - (narrow ? 1.8 : 3)} ${ex + 4.4} ${eyeY + 0.4}`} stroke="#1a120c" strokeWidth={1.3} fill="none" />);
      push(<Path key={`lidShade${side}`} d={`M ${ex - 4} ${eyeY - 0.2} Q ${ex} ${eyeY - (narrow ? 1.4 : 2.4)} ${ex + 4} ${eyeY - 0.2} Q ${ex} ${eyeY - 0.4} ${ex - 4} ${eyeY - 0.2} Z`} fill="#1a120c" opacity={0.45} />);
      if (narrow || old) push(<Path key={`bag${side}`} d={`M ${ex - 4} ${eyeY + 3} Q ${ex} ${eyeY + 4.6} ${ex + 4} ${eyeY + 3}`} stroke="#1a120c" strokeWidth={0.7} fill="none" opacity={0.45} />);
    }
    // Брови.
    const heavy = s.brow === 'heavy';
    const grim = s.mouth === 'grim' || heavy;
    for (const side of [-1, 1] as const) {
      const ex = CX + side * eyeDX;
      const inner = ex - side * 5;
      const outer = ex + side * 6;
      const innerY = eyeY - (grim ? 4.2 : 5.5);
      const outerY = eyeY - (grim ? 6.8 : 6.5);
      push(<Path key={`brow${side}`} d={`M ${inner} ${innerY} Q ${ex - side * 1} ${eyeY - (grim ? 6.5 : 7)} ${outer} ${outerY}`} stroke={hairDark} strokeWidth={heavy ? 2.8 : 1.5} strokeLinecap="round" fill="none" opacity={0.92} />);
    }
  }

  // --- Нос.
  const noseTop = eyeY + 1;
  const noseBottom = 59;
  if (s.nose === 'broken') {
    push(<Path key="nose" d={`M ${CX + 1} ${noseTop} L ${CX - 2} ${noseTop + 5} L ${CX + 2.5} ${noseBottom - 2}`} stroke={skinDeep} strokeWidth={1.3} fill="none" strokeLinejoin="round" />);
    push(<Path key="noseShade" d={`M ${CX - 2} ${noseTop + 5} L ${CX + 2.5} ${noseBottom - 2} L ${CX + 4} ${noseBottom - 1} Z`} fill="#1a120c" opacity={0.25} />);
  } else {
    push(<Path key="nose" d={`M ${CX + 1} ${noseTop} C ${CX + 1.5} ${noseTop + 5} ${CX + 2.5} ${noseBottom - 5} ${CX + 3} ${noseBottom - 2}`} stroke={skinDeep} strokeWidth={1.2} fill="none" />);
    push(<Path key="noseShade" d={`M ${CX + 1} ${noseTop + 2} C ${CX + 3} ${noseTop + 6} ${CX + 4} ${noseBottom - 5} ${CX + 5} ${noseBottom - 1} L ${CX + 2} ${noseBottom - 1} Z`} fill="#1a120c" opacity={0.18} />);
  }
  const nw = s.nose === 'wide' ? 6 : 4.2;
  push(<Path key="nostrils" d={`M ${CX - nw} ${noseBottom - 1} Q ${CX - nw + 1} ${noseBottom + 1.5} ${CX - 1.5} ${noseBottom + 1} M ${CX + nw} ${noseBottom - 1} Q ${CX + nw - 1} ${noseBottom + 1.5} ${CX + 1.5} ${noseBottom + 1}`} stroke={skinDeep} strokeWidth={1.2} fill="none" strokeLinecap="round" />);
  push(<Path key="noseUnder" d={`M ${CX - nw + 1} ${noseBottom + 1.5} Q ${CX} ${noseBottom + 3.5} ${CX + nw - 1} ${noseBottom + 1.5}`} fill="#1a120c" opacity={0.2} />);

  // --- Морщины.
  if (s.age !== 'young') {
    push(<Path key="naso" d={`M ${CX - 6} ${noseBottom} Q ${CX - 9} 66 ${CX - 7} 70 M ${CX + 6} ${noseBottom} Q ${CX + 9} 66 ${CX + 7} 70`} stroke="#1a120c" strokeWidth={0.8} fill="none" opacity={old ? 0.45 : 0.22} />);
  }
  if (old && !hidden) {
    push(<Path key="forehead" d={`M ${CX - 12} 30 Q ${CX} 28 ${CX + 12} 30 M ${CX - 10} 34 Q ${CX} 32.5 ${CX + 10} 34`} stroke="#1a120c" strokeWidth={0.7} fill="none" opacity={0.35} />);
    push(<Path key="crow" d={`M ${CX - 17} ${eyeY} l -3 -1.5 M ${CX - 17} ${eyeY + 1.5} l -3 1.5 M ${CX + 17} ${eyeY} l 3 -1.5 M ${CX + 17} ${eyeY + 1.5} l 3 1.5`} stroke="#1a120c" strokeWidth={0.7} fill="none" opacity={0.4} />);
  }

  // --- Борода (под ртом, но над шеей).
  const mouthY = 68;
  const beardFill = s.hairColor;
  if (s.beard === 'stubble') {
    push(<Path key="stubble" d={symmetric(58, [[CX + f.cw - 3, 58, CX + f.cw - 2, 66, CX + f.jw - 1, 70], [CX + f.jw - 3, 75, CX + f.chin + 4, f.bottom - 1, CX + f.chin - 1, f.bottom - 1]])} fill={hairDark} opacity={0.28} />);
  } else if (s.beard === 'short') {
    push(<Path key="beard" d={symmetric(60, [[CX + f.cw - 2, 59, CX + f.cw - 1, 66, CX + f.jw, 70], [CX + f.jw - 2, 76, CX + f.chin + 5, f.bottom + 1, CX + f.chin, f.bottom + 1]])} fill={beardFill} opacity={0.85} />);
    push(<Path key="mustache" d={`M ${CX - 7} ${mouthY - 3} Q ${CX} ${mouthY - 6} ${CX + 7} ${mouthY - 3} Q ${CX} ${mouthY - 2} ${CX - 7} ${mouthY - 3} Z`} fill={beardFill} opacity={0.85} />);
  } else if (s.beard === 'full') {
    push(<Path key="beard" d={symmetric(56, [[CX + f.cw - 1, 55, CX + f.cw + 1, 66, CX + f.jw + 2, 74], [CX + f.jw, 86, CX + f.chin + 8, 96, CX + 2, 97]])} fill={beardFill} />);
    push(<Path key="beardShade" d={`M ${CX} 97 C ${CX + 6} 96 ${CX + f.jw} 88 ${CX + f.jw + 2} 76 L ${CX + 4} 76 Z`} fill="#000" opacity={0.25} />);
    push(<Path key="mustache" d={`M ${CX - 9} ${mouthY - 2} Q ${CX} ${mouthY - 7} ${CX + 9} ${mouthY - 2} Q ${CX} ${mouthY - 1} ${CX - 9} ${mouthY - 2} Z`} fill={beardFill} />);
  } else if (s.beard === 'goatee') {
    push(<Path key="goatee" d={`M ${CX - 6} 71 Q ${CX} 73 ${CX + 6} 71 Q ${CX + 5} ${f.bottom + 6} ${CX} ${f.bottom + 8} Q ${CX - 5} ${f.bottom + 6} ${CX - 6} 71 Z`} fill={beardFill} />);
    push(<Path key="mustache" d={`M ${CX - 7} ${mouthY - 3} Q ${CX} ${mouthY - 6} ${CX + 7} ${mouthY - 3} Q ${CX} ${mouthY - 2} ${CX - 7} ${mouthY - 3} Z`} fill={beardFill} opacity={0.9} />);
  }

  // --- Рот.
  if (s.mouth === 'grin') {
    push(<Path key="mouth" d={`M ${CX - 7} ${mouthY - 1} Q ${CX} ${mouthY + 4} ${CX + 7} ${mouthY - 1}`} stroke="#1a120c" strokeWidth={1.3} fill="none" strokeLinecap="round" />);
    push(<Path key="teeth" d={`M ${CX - 5} ${mouthY} Q ${CX} ${mouthY + 2.6} ${CX + 5} ${mouthY} Z`} fill="#b9ae98" />);
    push(<Rect key="gap" x={CX - 0.8} y={mouthY} width={1.6} height={1.8} fill="#1a120c" />);
  } else if (s.mouth === 'grim') {
    push(<Path key="mouth" d={`M ${CX - 7} ${mouthY - 1} Q ${CX} ${mouthY + 0.5} ${CX + 7} ${mouthY - 1} M ${CX - 7} ${mouthY - 1} l -1 1.5 M ${CX + 7} ${mouthY - 1} l 1 1.5`} stroke="#1a120c" strokeWidth={1.3} fill="none" strokeLinecap="round" />);
  } else {
    push(<Path key="mouth" d={`M ${CX - 6} ${mouthY} Q ${CX} ${mouthY + 1.2} ${CX + 6} ${mouthY}`} stroke="#1a120c" strokeWidth={1.2} fill="none" strokeLinecap="round" />);
    push(<Path key="lip" d={`M ${CX - 5} ${mouthY + 1} Q ${CX} ${mouthY + 3} ${CX + 5} ${mouthY + 1}`} stroke={skinDeep} strokeWidth={0.8} fill="none" opacity={0.6} />);
  }

  // --- Шрамы.
  const scarStroke = mixHex(skin, '#8a3a3a', 0.45);
  if (s.scar === 'cheek') {
    push(<Path key="scar" d={`M ${CX - f.cw + 6} 52 L ${CX - f.cw + 11} 64`} stroke={scarStroke} strokeWidth={1.3} strokeLinecap="round" />);
    push(<Path key="scarTicks" d={`M ${CX - f.cw + 7} 56 l 2.5 -0.8 M ${CX - f.cw + 9} 60 l 2.5 -0.8`} stroke={scarStroke} strokeWidth={0.8} />);
  } else if (s.scar === 'brow' && !hidden) {
    push(<Path key="scar" d={`M ${CX + 13} 35 L ${CX + 16} 42`} stroke={scarStroke} strokeWidth={1.4} strokeLinecap="round" />);
  } else if (s.scar === 'across') {
    push(<Path key="scar" d={`M ${CX - 14} 28 C ${CX - 10} 40 ${CX - 2} 52 ${CX + 6} 66`} stroke={scarStroke} strokeWidth={1.5} strokeLinecap="round" fill="none" />);
    push(<Path key="scarTicks" d={`M ${CX - 13} 34 l 3 -1 M ${CX - 9} 44 l 3 -1 M ${CX - 3} 54 l 3 -1 M ${CX + 3} 62 l 3 -1`} stroke={scarStroke} strokeWidth={0.8} />);
  }

  // --- Повязка на глаз: поверх глаз, под волосами.
  if (s.eyes === 'patch-left' || s.eyes === 'patch-right') {
    const side = s.eyes === 'patch-left' ? -1 : 1;
    const ex = CX + side * eyeDX;
    push(<Path key="patchStrap" d={`M ${CX - f.cw - 1} 44 Q ${CX} 36 ${CX + f.cw + 1} 44`} stroke="#15100c" strokeWidth={1.6} fill="none" />);
    push(<Ellipse key="patch" cx={ex} cy={eyeY} rx={6} ry={4.6} fill="#15100c" />);
  }

  // --- Волосы и головные уборы.
  const hairFront = (d: string, fill = s.hairColor) => push(<Path key="hair" d={d} fill={fill} />);
  if (s.hair === 'cropped') {
    hairFront(
      symmetric(f.top - 1.5, [
        [CX + f.fw * 0.8, f.top - 2, CX + f.fw + 1.5, f.top + 6, CX + f.fw + 1.5, 36],
        [CX + f.fw - 1, 32, CX + f.fw * 0.5, 24, CX + 4, 24],
      ]),
    );
    push(<Path key="hairline" d={`M ${CX - f.fw + 3} 36 Q ${CX - f.fw * 0.5} 25 ${CX + 2} 24.5`} stroke={hairDark} strokeWidth={0.8} fill="none" opacity={0.6} />);
  } else if (s.hair === 'shaggy') {
    hairFront(
      `M ${CX - f.fw - 3} 44 C ${CX - f.fw - 5} 30 ${CX - f.fw - 2} ${f.top - 1} ${CX - 6} ${f.top - 3}
       C ${CX + 8} ${f.top - 5} ${CX + f.fw + 3} ${f.top + 2} ${CX + f.fw + 3} 30
       C ${CX + f.fw + 4} 36 ${CX + f.fw + 2} 44 ${CX + f.fw + 1} 48
       L ${CX + f.fw - 2} 40 L ${CX + f.fw - 6} 36 L ${CX + 10} 30 L ${CX + 4} 33 L ${CX - 2} 28 L ${CX - 9} 32 L ${CX - 14} 28 L ${CX - f.fw + 4} 34 L ${CX - f.fw + 1} 42 Z`,
    );
    push(<Path key="hairStrands" d={`M ${CX - 12} 28 L ${CX - 10} 36 M ${CX + 2} 29 L ${CX + 4} 35 M ${CX + 12} 30 L ${CX + 10} 37`} stroke={hairDark} strokeWidth={0.9} fill="none" opacity={0.7} />);
  } else if (s.hair === 'long') {
    hairFront(
      symmetric(f.top - 3, [
        [CX + f.fw * 0.8, f.top - 4, CX + f.fw + 3, f.top + 4, CX + f.fw + 3, 40],
        [CX + f.fw + 1, 38, CX + f.fw - 2, 30, CX + 2, 28],
      ]),
    );
    push(<Path key="parting" d={`M ${CX} ${f.top - 2} L ${CX} 27`} stroke={hairDark} strokeWidth={1} opacity={0.7} />);
    push(<Path key="hairSideL" d={`M ${CX - f.fw - 3} 40 C ${CX - f.fw - 6} 55 ${CX - f.cw - 3} 70 ${CX - f.cw - 2} 80 L ${CX - f.cw - 6} 82 C ${CX - f.cw - 8} 65 ${CX - f.fw - 8} 50 ${CX - f.fw - 3} 36 Z`} fill={s.hairColor} />);
    push(<Path key="hairSideR" d={`M ${CX + f.fw + 3} 40 C ${CX + f.fw + 6} 55 ${CX + f.cw + 3} 70 ${CX + f.cw + 2} 80 L ${CX + f.cw + 6} 82 C ${CX + f.cw + 8} 65 ${CX + f.fw + 8} 50 ${CX + f.fw + 3} 36 Z`} fill={hairDark} />);
  } else if (s.hair === 'bald') {
    push(<Ellipse key="shine" cx={CX - 8} cy={f.top + 9} rx={9} ry={5} fill="#fff6e0" opacity={0.08} />);
  } else if (s.hair === 'hood') {
    const openY = hidden ? 54 : 30;
    const outer = HOOD_OUTER;
    const inner = hidden
      ? `M ${CX - f.cw - 1} ${openY} C ${CX - f.cw - 2} 64 ${CX - f.jw - 4} 82 ${CX} 86 C ${CX + f.jw + 4} 82 ${CX + f.cw + 2} 64 ${CX + f.cw + 1} ${openY} Z`
      : faceOpening(f, openY);
    push(<Path key="hood" d={`${outer} ${inner}`} fill={s.cloth} fillRule="evenodd" />);
    push(<Path key="hoodFold" d={`M 20 60 C 26 70 30 86 30 ${H} M 80 60 C 74 70 70 86 70 ${H}`} stroke="#000" strokeWidth={1.2} fill="none" opacity={0.35} />);
    push(<Path key="hoodEdge" d={`${inner}`} stroke="#000" strokeWidth={1.4} fill="none" opacity={0.5} />);
  } else if (s.hair === 'coif') {
    const quilt = '#5b5147';
    const outer = symmetric(f.top - 4, [
      [CX + f.fw * 0.8, f.top - 4, CX + f.fw + 4, f.top + 6, CX + f.fw + 4, 36],
      [CX + f.cw + 4, 46, CX + f.cw + 5, 64, CX + f.jw + 4, 76],
      [CX + f.jw + 2, 84, CX + 8, 88, CX, 88],
    ]);
    push(<Path key="coif" d={`${outer} ${faceOpening(f, 27)}`} fill={quilt} fillRule="evenodd" />);
    push(<Path key="quilt" d={`M ${CX - f.fw - 2} 30 Q ${CX} 14 ${CX + f.fw + 2} 30 M ${CX - f.fw - 3} 44 Q ${CX - f.fw + 4} 60 ${CX - f.jw - 2} 80 M ${CX + f.fw + 3} 44 Q ${CX + f.fw - 4} 60 ${CX + f.jw + 2} 80`} stroke="#2f2923" strokeWidth={0.9} fill="none" opacity={0.8} />);
    push(<Path key="coifEdge" d={faceOpening(f, 27)} stroke="#2f2923" strokeWidth={1.1} fill="none" opacity={0.7} />);
  } else if (s.hair === 'scarf') {
    const scarfColor = '#4a3a3d';
    const outer = symmetric(f.top - 4, [
      [CX + f.fw * 0.8, f.top - 5, CX + f.fw + 5, f.top + 4, CX + f.fw + 5, 36],
      [CX + f.cw + 6, 48, CX + f.cw + 6, 70, CX + f.jw + 6, 84],
      [CX + f.jw + 2, 92, CX + 8, 94, CX, 94],
    ]);
    push(<Path key="scarf" d={`${outer} ${faceOpening(f, 25)}`} fill={scarfColor} fillRule="evenodd" />);
    push(<Path key="scarfFold" d={`M ${CX - f.fw - 3} 32 Q ${CX - f.fw + 2} 60 ${CX - f.jw - 4} 84 M ${CX + f.fw + 3} 32 Q ${CX + f.fw - 2} 60 ${CX + f.jw + 4} 84 M ${CX - 8} 90 Q ${CX} 86 ${CX + 8} 90`} stroke="#000" strokeWidth={1} fill="none" opacity={0.35} />);
    push(<Path key="knot" d={`M ${CX - 4} 88 Q ${CX} 84 ${CX + 4} 88 Q ${CX} 92 ${CX - 4} 88 Z`} fill={mixHex(scarfColor, '#000', 0.3)} />);
    push(<Path key="scarfEdge" d={faceOpening(f, 25)} stroke="#000" strokeWidth={1.1} fill="none" opacity={0.45} />);
  }

  // --- Серьга.
  if (s.earring !== 'none') {
    const ex = s.earring === 'left' ? CX - f.cw - 1.5 : CX + f.cw + 1.5;
    push(<Circle key="ring" cx={ex} cy={earY + 6.5} r={1.8} stroke="#b8923e" strokeWidth={1} fill="none" />);
  }

  // --- Повязка от травмы: грязная тряпка через лоб.
  if (injured) {
    push(<Path key="bandage" d={`M ${CX - f.fw - 2} 36 Q ${CX} 30 ${CX + f.fw + 2} 36 L ${CX + f.fw + 1} 41 Q ${CX} 35.5 ${CX - f.fw - 1} 41 Z`} fill="#a89d88" />);
    push(<Path key="bandageLine" d={`M ${CX - f.fw} 38.5 Q ${CX} 33 ${CX + f.fw} 38.5`} stroke="#6f6452" strokeWidth={0.6} fill="none" opacity={0.6} />);
    push(<Ellipse key="bandageBlood" cx={CX - 8} cy={37} rx={4} ry={1.8} fill="#6e2a24" opacity={0.8} />);
  }

  // --- Кровь при малом здоровье.
  if (bleeding) {
    push(<Path key="blood" d={`M ${CX + 3} 60 Q ${CX + 4} 66 ${CX + 3.5} 72`} stroke="#5a1d17" strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.9} />);
    push(<Path key="blood2" d={`M ${CX - f.cw + 10} 40 Q ${CX - f.cw + 9} 48 ${CX - f.cw + 11} 55`} stroke="#5a1d17" strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.8} />);
  }

  // --- Тень на весь портрет: раненый уходит в темноту.
  if (fade > 0) {
    push(<Rect key="dim" x={0} y={0} width={W} height={H} fill="#0b0806" opacity={0.45 * fade} />);
  }

  return nodes;
}
