import { parseOptionalNumber, sanitizeNumericInput, stepValue } from './number-field';

describe('sanitizeNumericInput', () => {
  it('strips non-numeric characters', () => {
    expect(sanitizeNumericInput('18kg0')).toBe('180');
  });

  it('keeps a single decimal point', () => {
    expect(sanitizeNumericInput('18.5')).toBe('18.5');
  });

  it('drops every decimal point after the first', () => {
    expect(sanitizeNumericInput('1.2.3')).toBe('1.23');
  });

  it('handles an input that is only a decimal point', () => {
    expect(sanitizeNumericInput('.')).toBe('.');
  });

  it('returns an empty string unchanged', () => {
    expect(sanitizeNumericInput('')).toBe('');
  });
});

describe('parseOptionalNumber', () => {
  it('parses a plain integer', () => {
    expect(parseOptionalNumber('180')).toBe(180);
  });

  it('parses a decimal', () => {
    expect(parseOptionalNumber('72.5')).toBe(72.5);
  });

  it('returns null for empty input', () => {
    expect(parseOptionalNumber('')).toBeNull();
  });

  it('returns null instead of NaN for a lone decimal point', () => {
    expect(parseOptionalNumber('.')).toBeNull();
  });
});

describe('stepValue', () => {
  it('increments a numeric value', () => {
    expect(stepValue('8', 1)).toBe('9');
  });

  it('decrements a numeric value', () => {
    expect(stepValue('8', -1)).toBe('7');
  });

  it('treats empty input as starting from 0', () => {
    expect(stepValue('', 1)).toBe('1');
  });

  it('clamps to the minimum', () => {
    expect(stepValue('0', -1, 0)).toBe('0');
  });

  it('clamps to the maximum', () => {
    expect(stepValue('12', 1, 0, 12)).toBe('12');
  });

  it('supports a step other than 1', () => {
    expect(stepValue('60', 2.5)).toBe('62.5');
  });
});
