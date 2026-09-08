const axios = require('axios');
const {
  isValidCodeforcesHandle,
  fetchCodeforcesProfile,
  processCodeforcesData,
  getRatingBucket,
} = require('../../src/services/codeforces.service');

jest.mock('axios');

describe('Codeforces Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Handle Validation', () => {
    it('should validate legal Codeforces handles', () => {
      expect(isValidCodeforcesHandle('tourist')).toBe(true);
      expect(isValidCodeforcesHandle('Petr')).toBe(true);
      expect(isValidCodeforcesHandle('user_123')).toBe(true);
      expect(isValidCodeforcesHandle('code-forces.user')).toBe(true);
    });

    it('should reject invalid handles', () => {
      expect(isValidCodeforcesHandle('')).toBe(false);
      expect(isValidCodeforcesHandle('a')).toBe(false); // under 2 chars
      expect(isValidCodeforcesHandle('this_handle_is_way_too_long_for_codeforces_limits_over_32_chars')).toBe(false);
      expect(isValidCodeforcesHandle('https://codeforces.com/profile/tourist')).toBe(false);
      expect(isValidCodeforcesHandle('user@name')).toBe(false);
      expect(isValidCodeforcesHandle(null)).toBe(false);
    });
  });

  describe('Rating Bucket Helper', () => {
    it('should assign correct buckets based on rating numbers', () => {
      expect(getRatingBucket(800)).toBe('<1000');
      expect(getRatingBucket(1100)).toBe('1000-1199');
      expect(getRatingBucket(1300)).toBe('1200-1399');
      expect(getRatingBucket(1500)).toBe('1400-1599');
      expect(getRatingBucket(1700)).toBe('1600-1799');
      expect(getRatingBucket(1900)).toBe('1800-1999');
      expect(getRatingBucket(2400)).toBe('2000+');
      expect(getRatingBucket(null)).toBe('Unrated');
      expect(getRatingBucket(undefined)).toBe('Unrated');
    });
  });

  describe('Submission Processing & Deduplication', () => {
    it('should deduplicate accepted submissions and count totalSolved accurately', () => {
      const submissions = [
        // Problem 1: Accepted twice
        {
          id: 1,
          contestId: 100,
          verdict: 'OK',
          programmingLanguage: 'GNU C++17',
          problem: { contestId: 100, index: 'A', name: 'Watermelon', rating: 800, tags: ['brute force', 'math'] },
        },
        {
          id: 2,
          contestId: 100,
          verdict: 'OK',
          programmingLanguage: 'Python 3',
          problem: { contestId: 100, index: 'A', name: 'Watermelon', rating: 800, tags: ['brute force', 'math'] },
        },
        // Problem 2: Failed first, then accepted
        {
          id: 3,
          contestId: 100,
          verdict: 'WRONG_ANSWER',
          programmingLanguage: 'GNU C++17',
          problem: { contestId: 100, index: 'B', name: 'Theatre Square', rating: 1000, tags: ['math'] },
        },
        {
          id: 4,
          contestId: 100,
          verdict: 'OK',
          programmingLanguage: 'GNU C++17',
          problem: { contestId: 100, index: 'B', name: 'Theatre Square', rating: 1000, tags: ['math'] },
        },
        // Problem 3: Never accepted
        {
          id: 5,
          contestId: 100,
          verdict: 'TIME_LIMIT_EXCEEDED',
          programmingLanguage: 'Java 21',
          problem: { contestId: 100, index: 'C', name: 'Hard Problem', rating: 2200, tags: ['dp'] },
        },
      ];

      const userInfo = {
        handle: 'testcoder',
        rating: 1450,
        maxRating: 1600,
        rank: 'specialist',
        maxRank: 'expert',
      };

      const result = processCodeforcesData('testcoder', userInfo, submissions, [{ contestId: 100 }]);

      // Total unique problems solved must be 2 (Problem A and Problem B)
      expect(result.totalSolved).toBe(2);
      expect(result.handle).toBe('testcoder');
      expect(result.profileUrl).toBe('https://codeforces.com/profile/testcoder');
      expect(result.rating).toBe(1450);
      expect(result.maxRating).toBe(1600);
      expect(result.rank).toBe('specialist');

      // Problem A has ['brute force', 'math'], Problem B has ['math']
      expect(result.tags['math']).toBe(2);
      expect(result.tags['brute force']).toBe(1);
      expect(result.tags['dp']).toBeUndefined(); // never solved

      // Rating buckets
      expect(result.ratingBuckets['<1000']).toBe(1); // Watermelon (800)
      expect(result.ratingBuckets['1000-1199']).toBe(1); // Theatre Square (1000)

      // Contests
      expect(result.contests.participated).toBe(1);
      expect(result.contests.rated).toBe(1);
    });

    it('should properly handle multi-tag problems without double-counting solved problems', () => {
      const submissions = [
        {
          id: 10,
          contestId: 200,
          verdict: 'OK',
          programmingLanguage: 'GNU C++20',
          problem: {
            contestId: 200,
            index: 'D',
            name: 'Graph DP',
            rating: 1800,
            tags: ['dp', 'graphs', 'dfs and similar', 'trees'],
          },
        },
      ];

      const result = processCodeforcesData('graph_master', {}, submissions, []);

      expect(result.totalSolved).toBe(1);
      expect(result.tags['dp']).toBe(1);
      expect(result.tags['graphs']).toBe(1);
      expect(result.tags['dfs and similar']).toBe(1);
      expect(result.tags['trees']).toBe(1);
      expect(result.ratingBuckets['1800-1999']).toBe(1);
    });

    it('should handle unrated or missing problem metadata safely', () => {
      const submissions = [
        {
          id: 20,
          contestId: 300,
          verdict: 'OK',
          problem: {
            contestId: 300,
            index: 'A',
            name: 'Mystery Problem',
            // No rating or tags
          },
        },
      ];

      const result = processCodeforcesData('explorer', {}, submissions, []);
      expect(result.totalSolved).toBe(1);
      expect(result.ratingBuckets['Unrated']).toBe(1);
      expect(Object.keys(result.tags).length).toBe(0);
    });
  });

  describe('fetchCodeforcesProfile', () => {
    it('should throw CODEFORCES_INVALID_HANDLE on invalid handle format', async () => {
      await expect(fetchCodeforcesProfile('invalid/handle')).rejects.toMatchObject({
        code: 'CODEFORCES_INVALID_HANDLE',
      });
    });

    it('should fetch and return normalized profile on valid handle', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('user.info')) {
          return Promise.resolve({
            data: {
              status: 'OK',
              result: [{
                handle: 'tourist',
                rating: 3800,
                maxRating: 4009,
                rank: 'tourist',
                maxRank: 'tourist',
              }],
            },
          });
        }
        if (url.includes('user.status')) {
          return Promise.resolve({
            data: {
              status: 'OK',
              result: [{
                id: 1001,
                contestId: 500,
                verdict: 'OK',
                programmingLanguage: 'GNU C++17',
                problem: { contestId: 500, index: 'A', name: 'Problem A', rating: 1600, tags: ['greedy'] },
              }],
            },
          });
        }
        if (url.includes('user.rating')) {
          return Promise.resolve({
            data: {
              status: 'OK',
              result: [{ contestId: 500, newRating: 1650 }],
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const profile = await fetchCodeforcesProfile('tourist');
      expect(profile.handle).toBe('tourist');
      expect(profile.totalSolved).toBe(1);
      expect(profile.rating).toBe(3800);
      expect(profile.tags['greedy']).toBe(1);
      expect(profile.status).toBe('connected');
    });

    it('should throw CODEFORCES_PROFILE_NOT_FOUND when user does not exist', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('user.info')) {
          const err = new Error('Request failed with status code 400');
          err.response = {
            status: 400,
            data: { status: 'FAILED', comment: 'handles: User with handle nonexistent not found' },
          };
          return Promise.reject(err);
        }
        return Promise.reject(new Error('Unexpected'));
      });

      await expect(fetchCodeforcesProfile('nonexistent')).rejects.toMatchObject({
        code: 'CODEFORCES_PROFILE_NOT_FOUND',
      });
    });

    it('should throw CODEFORCES_TIMEOUT on network timeout', async () => {
      axios.get.mockImplementation(() => {
        const err = new Error('timeout of 8000ms exceeded');
        err.code = 'ECONNABORTED';
        return Promise.reject(err);
      });

      await expect(fetchCodeforcesProfile('tourist')).rejects.toMatchObject({
        code: 'CODEFORCES_TIMEOUT',
      });
    });

    it('should throw CODEFORCES_RATE_LIMIT on 429 response', async () => {
      axios.get.mockImplementation(() => {
        const err = new Error('Request failed with status code 429');
        err.response = {
          status: 429,
          data: { status: 'FAILED', comment: 'limit exceeded' },
        };
        return Promise.reject(err);
      });

      await expect(fetchCodeforcesProfile('tourist')).rejects.toMatchObject({
        code: 'CODEFORCES_RATE_LIMIT',
      });
    });
  });
});
