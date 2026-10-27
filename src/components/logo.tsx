import Svg, { Circle, Defs, G, Mask, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** Biteboard mark: a plate with a cookie-style bite out of the top right. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <Mask id="bite">
          <Rect width="64" height="64" fill="#fff" />
          <Circle cx="51" cy="12" r="11" fill="#000" />
          <Circle cx="61" cy="27" r="8.5" fill="#000" />
          <Circle cx="38" cy="3" r="8" fill="#000" />
        </Mask>
      </Defs>
      <G mask="url(#bite)">
        <Circle cx="32" cy="32" r="28" fill={Colors.accent} />
        <Circle cx="32" cy="32" r="18" fill="none" stroke={Colors.bg} strokeWidth={3} />
      </G>
    </Svg>
  );
}
