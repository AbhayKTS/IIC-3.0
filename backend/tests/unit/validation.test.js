const {
  isNonEmptyString,
  isValidUrl,
  clampArray,
  isValidDateString,
  isStringArray,
} = require('../../src/utils/validation');

describe('validation utils', () => {
  describe('isNonEmptyString', () => {
    it('returns true for non-empty trimmed strings', () => {
      expect(isNonEmptyString('abc')).toBe(true);
      expect(isNonEmptyString('  abc  ')).toBe(true);
    });

    it('returns false for empty and non-string values', () => {
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('accepts http and https urls', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('rejects invalid and unsupported urls', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('   ')).toBe(false);
    });
  });

  describe('clampArray', () => {
    it('returns empty array for non-array inputs', () => {
      expect(clampArray(null, 2)).toEqual([]);
      expect(clampArray('abc', 2)).toEqual([]);
    });

    it('limits array length to max', () => {
      expect(clampArray([1, 2, 3], 2)).toEqual([1, 2]);
      expect(clampArray([1], 3)).toEqual([1]);
    });
  });

  describe('isValidDateString', () => {
    it('accepts valid ISO date strings', () => {
      expect(isValidDateString('2026-02-16T00:00:00.000Z')).toBe(true);
      expect(isValidDateString('2026-02-16')).toBe(true);
    });

    it('rejects invalid or empty values', () => {
      expect(isValidDateString('')).toBe(false);
      expect(isValidDateString('bad-date')).toBe(false);
      expect(isValidDateString(undefined)).toBe(false);
    });
  });

  describe('isStringArray', () => {
    it('returns true when all items are non-empty strings', () => {
      expect(isStringArray(['a', 'b'])).toBe(true);
    });

    it('returns false when not an array or contains invalid item', () => {
      expect(isStringArray('a,b')).toBe(false);
      expect(isStringArray(['a', ''])).toBe(false);
      expect(isStringArray(['a', 1])).toBe(false);
    });
  });
});