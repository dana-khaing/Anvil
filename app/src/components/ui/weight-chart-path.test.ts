import { getWeightChartCoordinates } from './weight-chart-path';

describe('getWeightChartCoordinates', () => {
  it('maps weights across the available chart bounds', () => {
    expect(
      getWeightChartCoordinates(
        [
          { date: '2025-01-01', weightKg: 80 },
          { date: '2025-01-02', weightKg: 75 },
          { date: '2025-01-03', weightKg: 70 },
        ],
        280,
        120,
      ),
    ).toEqual([
      { x: 0, y: 12 },
      { x: 140, y: 60 },
      { x: 280, y: 108 },
    ]);
  });

  it('keeps an unchanged series on the lower padded baseline', () => {
    expect(
      getWeightChartCoordinates(
        [
          { date: '2025-01-01', weightKg: 75 },
          { date: '2025-01-02', weightKg: 75 },
        ],
        200,
        100,
      ),
    ).toEqual([
      { x: 0, y: 88 },
      { x: 200, y: 88 },
    ]);
  });

  it('returns no drawable coordinates for fewer than two points', () => {
    expect(getWeightChartCoordinates([{ date: '2025-01-01', weightKg: 75 }], 280, 120)).toEqual([]);
  });
});
