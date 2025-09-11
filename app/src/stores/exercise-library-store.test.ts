import { parseAlternativeIds } from './exercise-library-store';

jest.mock('@/db/client', () => ({ db: {} }));

describe('parseAlternativeIds', () => {
  it('parses a JSON array of ids', () => {
    expect(parseAlternativeIds('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty JSON array', () => {
    expect(parseAlternativeIds('[]')).toEqual([]);
  });

  it('returns an empty array for malformed JSON instead of throwing', () => {
    expect(parseAlternativeIds('not json')).toEqual([]);
  });

  it('returns an empty array for valid JSON that is not an array', () => {
    expect(parseAlternativeIds('{"a":1}')).toEqual([]);
  });

  it('drops non-string entries from an otherwise valid array', () => {
    expect(parseAlternativeIds('["a", 1, null, "b"]')).toEqual(['a', 'b']);
  });
});
