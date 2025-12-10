import type { WeightChartPoint } from './weight-chart';

export type WeightChartCoordinate = { x: number; y: number };

export function getWeightChartCoordinates(
  points: WeightChartPoint[],
  width: number,
  height: number,
): WeightChartCoordinate[] {
  if (points.length < 2) return [];

  const weights = points.map((point) => point.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const paddingY = 12;

  return points.map((point, index) => ({
    x: (index / (points.length - 1)) * width,
    y: height - paddingY - ((point.weightKg - min) / range) * (height - paddingY * 2),
  }));
}
