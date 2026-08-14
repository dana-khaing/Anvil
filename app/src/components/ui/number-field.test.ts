import { parseOptionalNumber, sanitizeNumericInput } from './number-field';

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
