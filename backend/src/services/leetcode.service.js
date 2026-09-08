const axios = require('axios');
const logger = require('../utils/logger');

const LEETCODE_GRAPHQL_ENDPOINT = process.env.LEETCODE_GRAPHQL_ENDPOINT || 'https://leetcode.com/graphql';
const REQUEST_TIMEOUT_MS = Number(process.env.LEETCODE_TIMEOUT_MS) || 8000;

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

const GET_USER_PROFILE_QUERY = `
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
    languageProblemCount {
      languageName
      problemsSolved
    }
    tagProblemCounts {
      advanced {
        tagName
        problemsSolved
      }
      intermediate {
        tagName
        problemsSolved
      }
      fundamental {
        tagName
        problemsSolved
      }
    }
  }
}
`;

/**
 * Validates whether a LeetCode username conforms to public profile username rules.
 * @param {string} username
 * @returns {boolean}
 */
function isValidLeetCodeUsername(username) {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  return USERNAME_REGEX.test(trimmed);
}

/**
 * Normalizes raw LeetCode GraphQL payload into standard schema.
 * @param {string} username
 * @param {object} matchedUser
 * @returns {object}
 */
function normalizeLeetCodeData(username, matchedUser) {
  const acSubmissions = matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  let totalSolved = 0;
  let easy = 0;
  let medium = 0;
  let hard = 0;

  for (const item of acSubmissions) {
    const diff = (item?.difficulty || '').toLowerCase();
    const count = Number(item?.count) || 0;
    if (diff === 'all') totalSolved = count;
    else if (diff === 'easy') easy = count;
    else if (diff === 'medium') medium = count;
    else if (diff === 'hard') hard = count;
  }

  // If "all" was not provided, sum individual categories
  if (totalSolved === 0 && (easy > 0 || medium > 0 || hard > 0)) {
    totalSolved = easy + medium + hard;
  }

  // Languages breakdown
  const languages = {};
  const langList = Array.isArray(matchedUser?.languageProblemCount) ? matchedUser.languageProblemCount : [];
  for (const lang of langList) {
    if (lang?.languageName && Number.isFinite(lang?.problemsSolved)) {
      languages[lang.languageName] = lang.problemsSolved;
    }
  }

  // Skills / Topic breakdown from advanced, intermediate, fundamental
  const skills = {};
  const tagCategories = matchedUser?.tagProblemCounts || {};
  const allTagLists = [
    ...(Array.isArray(tagCategories.advanced) ? tagCategories.advanced : []),
    ...(Array.isArray(tagCategories.intermediate) ? tagCategories.intermediate : []),
    ...(Array.isArray(tagCategories.fundamental) ? tagCategories.fundamental : []),
  ];

  for (const tag of allTagLists) {
    if (tag?.tagName && Number.isFinite(tag?.problemsSolved)) {
      skills[tag.tagName] = (skills[tag.tagName] || 0) + tag.problemsSolved;
    }
  }

  const cleanUsername = username.trim();
  return {
    username: cleanUsername,
    profileUrl: `https://leetcode.com/u/${encodeURIComponent(cleanUsername)}/`,
    fetchedAt: new Date().toISOString(),
    totalSolved,
    easy,
    medium,
    hard,
    languages,
    skills,
    source: 'public_profile',
    status: 'connected',
    error: null,
  };
}

/**
 * Fetches public LeetCode statistics for a given username.
 * @param {string} username
 * @returns {Promise<object>} Normalized LeetCode statistics
 */
async function fetchLeetCodeProfile(username) {
  if (!isValidLeetCodeUsername(username)) {
    const err = new Error('Invalid LeetCode username format');
    err.code = 'LEETCODE_INVALID_USERNAME';
    err.status = 400;
    throw err;
  }

  const cleanUsername = username.trim();

  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_ENDPOINT,
      {
        query: GET_USER_PROFILE_QUERY,
        variables: { username: cleanUsername },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://leetcode.com/',
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    const data = response?.data;
    if (data?.errors && (!data?.data || !data?.data?.matchedUser)) {
      const isNotFound = data.errors.some((e) =>
        (e.message || '').toLowerCase().includes('does not exist') ||
        (e.message || '').toLowerCase().includes('not found')
      );
      const err = new Error(isNotFound ? 'LeetCode profile not found' : 'LeetCode GraphQL error');
      err.code = isNotFound ? 'LEETCODE_PROFILE_NOT_FOUND' : 'LEETCODE_API_ERROR';
      err.status = isNotFound ? 404 : 502;
      throw err;
    }

    const matchedUser = data?.data?.matchedUser;
    if (!matchedUser) {
      const err = new Error('LeetCode profile not found');
      err.code = 'LEETCODE_PROFILE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return normalizeLeetCodeData(cleanUsername, matchedUser);
  } catch (error) {
    if (error.code === 'LEETCODE_PROFILE_NOT_FOUND' || error.code === 'LEETCODE_INVALID_USERNAME') {
      throw error;
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      logger.warn(`[LeetCodeService] Request timed out for ${cleanUsername}`);
      const timeoutErr = new Error('LeetCode request timed out');
      timeoutErr.code = 'LEETCODE_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }

    if (error.response?.status === 404) {
      const notFoundErr = new Error('LeetCode profile not found');
      notFoundErr.code = 'LEETCODE_PROFILE_NOT_FOUND';
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    logger.warn(`[LeetCodeService] API error for ${cleanUsername}: ${error.message}`);
    const apiErr = new Error('Failed to fetch LeetCode profile');
    apiErr.code = 'LEETCODE_API_ERROR';
    apiErr.status = 502;
    apiErr.original = error.message;
    throw apiErr;
  }
}

module.exports = {
  isValidLeetCodeUsername,
  fetchLeetCodeProfile,
  normalizeLeetCodeData,
};
