const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { isValidLeetCodeUsername, cleanLeetCodeUsername } = require('../services/leetcode.service');
const { isValidCodeforcesHandle, cleanCodeforcesHandle } = require('../services/codeforces.service');
const { isValidGithubUsername, cleanGithubUsername } = require('../services/github.service');
const {
  syncStudentCodingProfiles,
  getStoredCodingProfiles,
} = require('../services/codingProfile.service');

/**
 * PUT /api/v1/student/coding-profiles
 * Saves / updates the authenticated student's coding handles and fetches fresh stats.
 */
const updateCodingProfiles = async (req, res, next) => {
  try {
    const studentId = req.userProfile?.uid;
    if (!studentId) {
      throw new CustomError('Authenticated student context required', 401, 'auth_missing');
    }

    const { leetcodeUsername, codeforcesHandle, githubUsername } = req.body || {};

    if (leetcodeUsername !== undefined && leetcodeUsername !== null && leetcodeUsername !== '') {
      if (!isValidLeetCodeUsername(leetcodeUsername)) {
        throw new CustomError('Invalid LeetCode username format. Only letters, numbers, underscores and dashes (1-30 chars) are allowed.', 400, 'LEETCODE_INVALID_USERNAME');
      }
    }

    if (codeforcesHandle !== undefined && codeforcesHandle !== null && codeforcesHandle !== '') {
      if (!isValidCodeforcesHandle(codeforcesHandle)) {
        throw new CustomError('Invalid Codeforces handle format. Only letters, numbers, underscores, dots and dashes (2-32 chars) are allowed.', 400, 'CODEFORCES_INVALID_HANDLE');
      }
    }

    if (githubUsername !== undefined && githubUsername !== null && githubUsername !== '') {
      if (!isValidGithubUsername(githubUsername)) {
        throw new CustomError('Invalid GitHub username format. Only alphanumeric characters or hyphens (1-39 chars) are allowed.', 400, 'GITHUB_INVALID_USERNAME');
      }
    }

    const codingProfiles = await syncStudentCodingProfiles(studentId, {
      leetcodeUsername: leetcodeUsername || (leetcodeUsername === '' ? null : undefined),
      codeforcesHandle: codeforcesHandle || (codeforcesHandle === '' ? null : undefined),
      githubUsername: githubUsername || (githubUsername === '' ? null : undefined),
      forceRefresh: true, // When user actively enters/updates handles, fetch fresh data
    });

    return ok(res, { codingProfiles });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/student/coding-profiles
 * Returns the authenticated student's normalized coding profiles.
 */
const getCodingProfiles = async (req, res, next) => {
  try {
    const studentId = req.userProfile?.uid;
    if (!studentId) {
      throw new CustomError('Authenticated student context required', 401, 'auth_missing');
    }

    const codingProfiles = await getStoredCodingProfiles(studentId);
    return ok(res, { codingProfiles });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/student/coding-profiles/refresh
 * Explicitly forces a fresh retrieval of coding statistics from external providers.
 */
const refreshCodingProfiles = async (req, res, next) => {
  try {
    const studentId = req.userProfile?.uid;
    if (!studentId) {
      throw new CustomError('Authenticated student context required', 401, 'auth_missing');
    }

    const codingProfiles = await syncStudentCodingProfiles(studentId, {
      forceRefresh: true,
    });

    return ok(res, { codingProfiles });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  updateCodingProfiles,
  getCodingProfiles,
  refreshCodingProfiles,
};
