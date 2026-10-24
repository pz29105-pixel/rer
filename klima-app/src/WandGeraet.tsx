import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Seitenverhältnis eines typischen Split-Wandgeräts (ca. 80 × 29 cm).
export const GERAET_BREITE = 200;
export const GERAET_HOEHE = 72;

type Props = { breite: number };

export default function WandGeraet({ breite }: Props) {
  const hoehe = (breite * GERAET_HOEHE) / GERAET_BREITE;
  return (
    <Svg width={breite} height={hoehe} viewBox={`0 0 ${GERAET_BREITE} ${GERAET_HOEHE}`}>
      <Defs>
        <LinearGradient id="gehaeuse" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#dfe3e8" />
        </LinearGradient>
      </Defs>
      <Rect x="1" y="1" width="198" height="70" rx="14" fill="url(#gehaeuse)" stroke="#b7bec7" strokeWidth="2" />
      <Path d="M14 50 H186" stroke="#c9cfd6" strokeWidth="2" />
      <Rect x="14" y="56" width="172" height="8" rx="4" fill="#a9b1bb" />
      <Rect x="160" y="18" width="18" height="6" rx="3" fill="#7cc4ff" />
    </Svg>
  );
}
