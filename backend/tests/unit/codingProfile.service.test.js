const {
  isFresh,
  extractCodingSkillEvidence,
  syncStudentCodingProfiles,
} = require('../../src/services/codingProfile.service');
const leetcodeService = require('../../src/services/leetcode.service');
const codeforcesService = require('../../src/services/codeforces.service');
const db = require('../../src/services/firestore');

jest.mock('../../src/services/leetcode.service');
jest.mock('../../src/services/codeforces.service');
jest.mock('../../src/services/firestore', () => {
  const store = new Map();
  return {
    collection: jest.fn((colName) => ({
      doc: jest.fn((id) => {
        const key = `${colName}/${id}`;
        return {
          get: jest.fn(async () => ({
            exists: store.has(key),
            data: () => store.get(key),
          })),
          set: jest.fn(async (data, opts = {}) => {
            if (opts.merge && store.has(key)) {
              store.set(key, { ...store.get(key), ...data });
            } else {
              store.set(key, data);
            }
          }),
        };
      }),
    })),
    __clearStore: () => store.clear(),
    __setDoc: (colName, id, data) => store.set(`${colName}/${id}`, data),
  };
});

describe('Coding Profile High-Level Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.__clearStore();
  });

  describe('isFresh', () => {
    it('should return true for recent timestamps within TTL', () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
      expect(isFresh(recent, 60 * 60 * 1000)).toBe(true);
    });

    it('should return false for timestamps older than TTL or missing', () => {
      const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      expect(isFresh(old, 60 * 60 * 1000)).toBe(false);
      expect(isFresh(null)).toBe(false);
      expect(isFresh(undefined)).toBe(false);
      expect(isFresh('invalid-date')).toBe(false);
    });
  });

  describe('extractCodingSkillEvidence', () => {
    it('should aggregate skills and apply domain mappings', () => {
      const leetcode = {
        skills: {
          'Dynamic Programming': 35,
          'Graph': 20,
          'Array': 50,
        },
      };

      const codeforces = {
        tags: {
          'dp': 25,
          'graphs': 15,
          'greedy': 30,
        },
      };

      const evidence = extractCodingSkillEvidence(leetcode, codeforces);

      expect(evidence['dynamic programming']).toBe(60); // 35 + 25
      expect(evidence['graphs']).toBe(15);
      expect(evidence['greedy']).toBe(30);
      expect(evidence['array']).toBe(50);
      expect(evidence['algorithms']).toBeGreaterThan(0);
    });
  });

  describe('syncStudentCodingProfiles', () => {
    it('should handle both providers succeeding', async () => {
      leetcodeService.fetchLeetCodeProfile.mockResolvedValueOnce({
        username: 'coder_lc',
        profileUrl: 'https://leetcode.com/u/coder_lc/',
        totalSolved: 200,
        status: 'connected',
        error: null,
      });

      codeforcesService.fetchCodeforcesProfile.mockResolvedValueOnce({
        handle: 'coder_cf',
        profileUrl: 'https://codeforces.com/profile/coder_cf',
        totalSolved: 150,
        status: 'connected',
        error: null,
      });

      const result = await syncStudentCodingProfiles('student_123', {
        leetcodeUsername: 'coder_lc',
        codeforcesHandle: 'coder_cf',
      });

      expect(result.leetcode.status).toBe('connected');
      expect(result.leetcode.totalSolved).toBe(200);
      expect(result.codeforces.status).toBe('connected');
      expect(result.codeforces.totalSolved).toBe(150);
    });

    it('should isolate failure: LeetCode succeeds while Codeforces fails', async () => {
      leetcodeService.fetchLeetCodeProfile.mockResolvedValueOnce({
        username: 'coder_lc',
        totalSolved: 120,
        status: 'connected',
        error: null,
      });

      codeforcesService.fetchCodeforcesProfile.mockRejectedValueOnce(
        new Error('Codeforces rate limit exceeded')
      );

      const result = await syncStudentCodingProfiles('student_456', {
        leetcodeUsername: 'coder_lc',
        codeforcesHandle: 'coder_cf',
      });

      expect(result.leetcode.status).toBe('connected');
      expect(result.leetcode.totalSolved).toBe(120);

      expect(result.codeforces.status).toBe('error');
      expect(result.codeforces.handle).toBe('coder_cf');
      expect(result.codeforces.error).toContain('Codeforces rate limit exceeded');
    });

    it('should isolate failure: Codeforces succeeds while LeetCode fails', async () => {
      leetcodeService.fetchLeetCodeProfile.mockRejectedValueOnce(
        new Error('LeetCode profile not found')
      );

      codeforcesService.fetchCodeforcesProfile.mockResolvedValueOnce({
        handle: 'valid_cf',
        totalSolved: 80,
        status: 'connected',
        error: null,
      });

      const result = await syncStudentCodingProfiles('student_789', {
        leetcodeUsername: 'missing_lc',
        codeforcesHandle: 'valid_cf',
      });

      expect(result.leetcode.status).toBe('error');
      expect(result.leetcode.error).toContain('LeetCode profile not found');

      expect(result.codeforces.status).toBe('connected');
      expect(result.codeforces.totalSolved).toBe(80);
    });

    it('should return cached data if fresh within TTL and forceRefresh is false', async () => {
      const freshTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      db.__setDoc('studentProfiles', 'student_cached', {
        codingProfiles: {
          leetcode: {
            username: 'cached_lc',
            status: 'connected',
            totalSolved: 500,
            fetchedAt: freshTimestamp,
          },
          codeforces: {
            handle: 'cached_cf',
            status: 'connected',
            totalSolved: 300,
            fetchedAt: freshTimestamp,
          },
        },
      });

      const result = await syncStudentCodingProfiles('student_cached', {
        leetcodeUsername: 'cached_lc',
        codeforcesHandle: 'cached_cf',
        forceRefresh: false,
      });

      // Should not call external APIs
      expect(leetcodeService.fetchLeetCodeProfile).not.toHaveBeenCalled();
      expect(codeforcesService.fetchCodeforcesProfile).not.toHaveBeenCalled();
      expect(result.leetcode.totalSolved).toBe(500);
      expect(result.codeforces.totalSolved).toBe(300);
    });
  });
});
