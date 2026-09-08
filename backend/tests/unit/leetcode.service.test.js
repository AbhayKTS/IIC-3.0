const axios = require('axios');
const {
  isValidLeetCodeUsername,
  fetchLeetCodeProfile,
  normalizeLeetCodeData,
} = require('../../src/services/leetcode.service');

jest.mock('axios');

describe('LeetCode Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Username Validation', () => {
    it('should validate valid LeetCode usernames', () => {
      expect(isValidLeetCodeUsername('lee215')).toBe(true);
      expect(isValidLeetCodeUsername('ansh_codr')).toBe(true);
      expect(isValidLeetCodeUsername('john-doe')).toBe(true);
      expect(isValidLeetCodeUsername('a')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidLeetCodeUsername('')).toBe(false);
      expect(isValidLeetCodeUsername('https://leetcode.com/lee215/')).toBe(false);
      expect(isValidLeetCodeUsername('user@domain')).toBe(false);
      expect(isValidLeetCodeUsername('name with spaces')).toBe(false);
      expect(isValidLeetCodeUsername(null)).toBe(false);
    });
  });

  describe('normalizeLeetCodeData', () => {
    it('should normalize GraphQL response correctly', () => {
      const matchedUser = {
        username: 'coder123',
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: 'All', count: 350 },
            { difficulty: 'Easy', count: 120 },
            { difficulty: 'Medium', count: 180 },
            { difficulty: 'Hard', count: 50 },
          ],
        },
        languageProblemCount: [
          { languageName: 'C++', problemsSolved: 200 },
          { languageName: 'Python3', problemsSolved: 150 },
        ],
        tagProblemCounts: {
          advanced: [
            { tagName: 'Dynamic Programming', problemsSolved: 45 },
            { tagName: 'Graph', problemsSolved: 25 },
          ],
          intermediate: [
            { tagName: 'Binary Search', problemsSolved: 40 },
          ],
          fundamental: [
            { tagName: 'Array', problemsSolved: 110 },
          ],
        },
      };

      const result = normalizeLeetCodeData('coder123', matchedUser);

      expect(result.username).toBe('coder123');
      expect(result.profileUrl).toBe('https://leetcode.com/u/coder123/');
      expect(result.totalSolved).toBe(350);
      expect(result.easy).toBe(120);
      expect(result.medium).toBe(180);
      expect(result.hard).toBe(50);
      expect(result.languages['C++']).toBe(200);
      expect(result.languages['Python3']).toBe(150);
      expect(result.skills['Dynamic Programming']).toBe(45);
      expect(result.skills['Array']).toBe(110);
      expect(result.status).toBe('connected');
      expect(result.error).toBeNull();
    });

    it('should calculate totalSolved from sub-difficulties if All is omitted', () => {
      const matchedUser = {
        username: 'coder_no_all',
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: 'Easy', count: 10 },
            { difficulty: 'Medium', count: 20 },
            { difficulty: 'Hard', count: 5 },
          ],
        },
      };

      const result = normalizeLeetCodeData('coder_no_all', matchedUser);
      expect(result.totalSolved).toBe(35);
    });
  });

  describe('fetchLeetCodeProfile', () => {
    it('should throw LEETCODE_INVALID_USERNAME on malformed username', async () => {
      await expect(fetchLeetCodeProfile('user/invalid')).rejects.toMatchObject({
        code: 'LEETCODE_INVALID_USERNAME',
      });
    });

    it('should return normalized profile on successful query', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          data: {
            matchedUser: {
              username: 'validuser',
              submitStatsGlobal: {
                acSubmissionNum: [
                  { difficulty: 'All', count: 100 },
                  { difficulty: 'Easy', count: 50 },
                  { difficulty: 'Medium', count: 40 },
                  { difficulty: 'Hard', count: 10 },
                ],
              },
              languageProblemCount: [{ languageName: 'Java', problemsSolved: 100 }],
              tagProblemCounts: { fundamental: [{ tagName: 'Hash Table', problemsSolved: 30 }] },
            },
          },
        },
      });

      const profile = await fetchLeetCodeProfile('validuser');
      expect(profile.username).toBe('validuser');
      expect(profile.totalSolved).toBe(100);
      expect(profile.status).toBe('connected');
    });

    it('should throw LEETCODE_PROFILE_NOT_FOUND when user does not exist', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          errors: [{ message: 'That user does not exist.' }],
          data: { matchedUser: null },
        },
      });

      await expect(fetchLeetCodeProfile('nonexistent_user')).rejects.toMatchObject({
        code: 'LEETCODE_PROFILE_NOT_FOUND',
      });
    });

    it('should throw LEETCODE_TIMEOUT on network timeout', async () => {
      axios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 8000ms exceeded',
      });

      await expect(fetchLeetCodeProfile('validuser')).rejects.toMatchObject({
        code: 'LEETCODE_TIMEOUT',
      });
    });

    it('should throw LEETCODE_API_ERROR on general server failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('Internal Server Error'));

      await expect(fetchLeetCodeProfile('validuser')).rejects.toMatchObject({
        code: 'LEETCODE_API_ERROR',
      });
    });
  });
});
