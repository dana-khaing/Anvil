import { Canvas, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

export type ProgressRingProps = {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  colors?: [string, string];
};

export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 10,
  trackColor = 'rgba(255,255,255,0.08)',
  colors = ['#7C5CFF', '#22D3EE'],
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const clamped = Math.min(1, Math.max(0, progress));

  const path = useMemo(() => Skia.Path.Circle(center, center, radius), [center, radius]);

  return (
    <View style={{ width: size, height: size }}>
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
