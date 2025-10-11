import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

export type WeightChartPoint = { date: string; weightKg: number };

export type WeightChartProps = {
  points: WeightChartPoint[];
  width?: number;
  height?: number;
};

/** A minimal line chart for weight-over-time -- no axes/labels, just the trend line. */
export function WeightChart({ points, width = 280, height = 120 }: WeightChartProps) {
  const path = useMemo(() => {
    const drawn = Skia.Path.Make();
    if (points.length < 2) return drawn;

    const weights = points.map((point) => point.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min || 1;
    const paddingY = 12;

    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - paddingY - ((point.weightKg - min) / range) * (height - paddingY * 2);
      if (index === 0) drawn.moveTo(x, y);
      else drawn.lineTo(x, y);
    });

    return drawn;
  }, [points, width, height]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Path path={path} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round">
          <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={['#7C5CFF', '#22D3EE']} />
        </Path>
      </Canvas>
    </View>
  );
}
