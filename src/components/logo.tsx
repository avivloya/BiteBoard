import Svg, { Circle, Defs, Ellipse, G, Mask, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** Snapspoon mark: a spoon with a bite taken out of the bowl. Same drawing as assets/brand/logo.svg. */
export function Logo({ size = 28, color = Colors.accent, ring = Colors.bg }: { size?: number; color?: string; ring?: string }) {
  return (
    <Svg width={size} height={size} viewBox="157 150 720 720">
      <Defs>
        <Mask id="bite" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
          <Rect x="-2000" y="-2000" width="5000" height="5000" fill="#fff" />
          <Circle cx="650" cy="250" r="72" fill="#000" />
          <Circle cx="660" cy="345" r="60" fill="#000" />
          <Circle cx="615" cy="168" r="58" fill="#000" />
        </Mask>
      </Defs>
      <G transform="rotate(35 512 512)">
        <G mask="url(#bite)">
          <Ellipse cx="512" cy="330" rx="165" ry="215" fill={color} />
          <Ellipse cx="482" cy="305" rx="78" ry="118" fill={ring} opacity={0.14} />
          <Path d="M484 520 Q512 556 540 520 L556 880 Q556 922 512 922 Q468 922 468 880 Z" fill={color} />
        </G>
      </G>
    </Svg>
  );
}
