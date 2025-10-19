import { Canvas, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { colors as themeColors } from '@/constants/colors';

export type ProgressRingProps = {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  colors?: [string, string];
  /**
   * Only pass this when the ring is the sole source of this information --
   * both current call sites sit next to text that already states the same
   * progress, so the ring stays hidden from screen readers by default
   * rather than announcing a redundant, unlabeled element.
   */
  accessibilityLabel?: string;
};

export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 10,
  trackColor = 'rgba(255,255,255,0.08)',
  colors = [themeColors.pulse500, themeColors.cyan400],
  accessibilityLabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const clamped = Math.min(1, Math.max(0, progress));

  const path = useMemo(() => Skia.Path.Circle(center, center, radius), [center, radius]);

  return (
    <View
      style={{ width: size, height: size }}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel !== undefined ? 'yes' : 'no-hide-descendants'}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ rotate: -Math.PI / 2 }]} origin={vec(center, center)}>
          <Path
            path={path}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            color={trackColor}
          />
          <Path
            path={path}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            start={0}
            end={clamped}>
            <SweepGradient c={vec(center, center)} colors={colors} />
          </Path>
        </Group>
      </Canvas>
    </View>
  );
}
