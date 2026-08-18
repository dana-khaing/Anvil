import { formatCountdown } from './rest-timer';

describe('formatCountdown', () => {
  it('formats the full rest duration as M:SS', () => {
    expect(formatCountdown(120)).toBe('2:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatCountdown(65)).toBe('1:05');
  });

  it('formats zero as 0:00', () => {
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('formats under a minute without a leading zero on minutes', () => {
    expect(formatCountdown(9)).toBe('0:09');
  });
});
