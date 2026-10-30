import { View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** Bitey's face: the Snapspoon plate, smiling. */
export function BiteyAvatar({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64">
        <Defs>
          <Mask id="bitey">
            <Rect width="64" height="64" fill="#fff" />
            <Circle cx="51" cy="12" r="11" fill="#000" /><Circle cx="61" cy="27" r="8.5" fill="#000" /><Circle cx="38" cy="3" r="8" fill="#000" />
          </Mask>
        </Defs>
        <G mask="url(#bitey)">
          <Circle cx="32" cy="32" r="28" fill={Colors.bg} />
          <Circle cx="24" cy="30" r="3.5" fill={Colors.accent} /><Circle cx="38" cy="30" r="3.5" fill={Colors.accent} />
          <Path d="M23 40q8 7 16 0" stroke={Colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}
