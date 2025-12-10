import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/colors';

import { getWeightChartCoordinates } from './weight-chart-path';

export type WeightChartPoint = { date: string; weightKg: number };

export type WeightChartProps = {
  points: WeightChartPoint[];
  width?: number;
  height?: number;
  /** A screen-reader summary of the trend -- the line itself has no text equivalent otherwise. */
  accessibilityLabel?: string;
};

/** A minimal line chart for weight-over-time -- no axes/labels, just the trend line. */
export function WeightChart({ points, width = 280, height = 120, accessibilityLabel }: WeightChartProps) {
  const path = useMemo(() => {
    const coordinates = getWeightChartCoordinates(points, width, height);
    if (coordinates.length === 0) return Skia.Path.Make();

    const builder = Skia.PathBuilder.Make();
    coordinates.forEach(({ x, y }, index) => {
      if (index === 0) builder.moveTo(x, y);
      else builder.lineTo(x, y);
    });

    return builder.detach();
  }, [points, width, height]);

  return (
    <View
      style={{ width, height }}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Canvas style={{ width, height }}>
        <Path path={path} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round">
          <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={[colors.pulse500, colors.cyan400]} />
        </Path>
      </Canvas>
    </View>
  );
}
