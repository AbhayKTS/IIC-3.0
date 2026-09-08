const axios = require('axios');
const logger = require('../utils/logger');

const CODEFORCES_API_BASE = process.env.CODEFORCES_API_BASE || 'https://codeforces.com/api';
const REQUEST_TIMEOUT_MS = Number(process.env.CODEFORCES_TIMEOUT_MS) || 8000;

const HANDLE_REGEX = /^[a-zA-Z0-9_.-]{2,32}$/;

const RATING_BUCKETS = [
  { label: '<1000', min: 0, max: 999 },
  { label: '1000-1199', min: 1000, max: 1199 },
  { label: '1200-1399', min: 1200, max: 1399 },
  { label: '1400-1599', min: 1400, max: 1599 },
  { label: '1600-1799', min: 1600, max: 1799 },
  { label: '1800-1999', min: 1800, max: 1999 },
  { label: '2000+', min: 2000, max: Infinity },
];

/**
 * Validates a Codeforces handle format.
 * @param {string} handle
 * @returns {boolean}
 */
function isValidCodeforcesHandle(handle) {
  if (typeof handle !== 'string') return false;
  const trimmed = handle.trim();
  return HANDLE_REGEX.test(trimmed);
}

/**
 * Helper to determine rating bucket for a problem rating.
 * @param {number|undefined|null} rating
 * @returns {string}
 */
function getRatingBucket(rating) {
  if (!Number.isFinite(rating)) return 'Unrated';
  for (const bucket of RATING_BUCKETS) {
    if (rating >= bucket.min && rating <= bucket.max) {
      return bucket.label;
    }
  }
  return '2000+';
}

/**
 * Normalizes and processes submissions and user info from Codeforces.
 * @param {string} handle
 * @param {object} userInfo
 * @param {Array} submissions
 * @param {Array} ratingHistory
 * @returns {object} Normalized Codeforces data
 */
function processCodeforcesData(handle, userInfo = {}, submissions = [], ratingHistory = []) {
  const cleanHandle = (userInfo.handle || handle).trim();
  const profileUrl = `https://codeforces.com/profile/${encodeURIComponent(cleanHandle)}`;

  // Deduplicate solved problems: composite key -> problem details
  const solvedProblemsMap = new Map();
  const contestIdsParticipated = new Set();
  const languageCounts = {};

  for (const sub of submissions) {
    if (!sub || typeof sub !== 'object') continue;

    if (sub.contestId) {
      contestIdsParticipated.add(sub.contestId);
    }

    if (sub.verdict === 'OK' && sub.problem) {
      const problem = sub.problem;
      const problemKey = problem.contestId && problem.index
        ? `${problem.contestId}_${problem.index}`
        : problem.name || `problem_${sub.id}`;

      if (!solvedProblemsMap.has(problemKey)) {
        solvedProblemsMap.set(problemKey, {
          rating: Number.isFinite(problem.rating) ? problem.rating : null,
          tags: Array.isArray(problem.tags) ? problem.tags : [],
          language: sub.programmingLanguage || 'Unknown',
        });

        // Record primary language for this newly counted solved problem
        const lang = (sub.programmingLanguage || 'Other').trim();
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
    }
  }

  const totalSolved = solvedProblemsMap.size;

  // Initialize rating buckets with 0
  const ratingBuckets = {
    '<1000': 0,
    '1000-1199': 0,
    '1200-1399': 0,
    '1400-1599': 0,
    '1600-1799': 0,
    '1800-1999': 0,
    '2000+': 0,
    'Unrated': 0,
  };

  const tagCounts = {};

  // Aggregate tags and rating buckets across unique solved problems
  for (const [, problem] of solvedProblemsMap) {
    // Rating bucket
    const bucket = getRatingBucket(problem.rating);
    ratingBuckets[bucket] = (ratingBuckets[bucket] || 0) + 1;

    // Multi-tag aggregation: each tag increments its counter, totalSolved is unaffected
    for (const rawTag of problem.tags) {
      if (typeof rawTag === 'string' && rawTag.trim()) {
        const tag = rawTag.trim();
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  const ratedContestsCount = Array.isArray(ratingHistory) ? ratingHistory.length : 0;
  const participatedCount = Math.max(contestIdsParticipated.size, ratedContestsCount);

  return {
    handle: cleanHandle,
    profileUrl,
    fetchedAt: new Date().toISOString(),
    rating: Number.isFinite(userInfo.rating) ? userInfo.rating : null,
    maxRating: Number.isFinite(userInfo.maxRating) ? userInfo.maxRating : null,
    rank: userInfo.rank || null,
    maxRank: userInfo.maxRank || null,
    totalSolved,
    ratingBuckets,
    tags: tagCounts,
    languages: languageCounts,
    contests: {
      participated: participatedCount,
      rated: ratedContestsCount,
    },
    source: 'official_api',
    status: 'connected',
    error: null,
  };
}

/**
 * Fetches public Codeforces statistics for a given handle.
 * @param {string} handle
 * @returns {Promise<object>} Normalized Codeforces statistics
 */
async function fetchCodeforcesProfile(handle) {
  if (!isValidCodeforcesHandle(handle)) {
    const err = new Error('Invalid Codeforces handle format');
    err.code = 'CODEFORCES_INVALID_HANDLE';
    err.status = 400;
    throw err;
  }

  const cleanHandle = handle.trim();

  try {
    // 1. Fetch user info
    const userInfoUrl = `${CODEFORCES_API_BASE}/user.info?handles=${encodeURIComponent(cleanHandle)}`;
    const userInfoRes = await axios.get(userInfoUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'AlmaDox-CollegeVerse/3.0 (academic-verification)',
      },
    });

    if (userInfoRes.data?.status !== 'OK' || !Array.isArray(userInfoRes.data?.result) || userInfoRes.data.result.length === 0) {
      const err = new Error('Codeforces profile not found');
      err.code = 'CODEFORCES_PROFILE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const userInfo = userInfoRes.data.result[0];

    // 2. Fetch submissions
    let submissions = [];
    try {
      const statusUrl = `${CODEFORCES_API_BASE}/user.status?handle=${encodeURIComponent(cleanHandle)}`;
      const statusRes = await axios.get(statusUrl, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'AlmaDox-CollegeVerse/3.0 (academic-verification)',
        },
      });
      if (statusRes.data?.status === 'OK' && Array.isArray(statusRes.data?.result)) {
        submissions = statusRes.data.result;
      }
    } catch (subErr) {
      logger.warn(`[CodeforcesService] Could not fetch submissions for ${cleanHandle}: ${subErr.message}`);
      // If user status times out but user info succeeded, we continue with empty submissions
    }

    // 3. Fetch rating history
    let ratingHistory = [];
    try {
      const ratingUrl = `${CODEFORCES_API_BASE}/user.rating?handle=${encodeURIComponent(cleanHandle)}`;
      const ratingRes = await axios.get(ratingUrl, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'AlmaDox-CollegeVerse/3.0 (academic-verification)',
        },
      });
      if (ratingRes.data?.status === 'OK' && Array.isArray(ratingRes.data?.result)) {
        ratingHistory = ratingRes.data.result;
      }
    } catch (rateErr) {
      logger.debug(`[CodeforcesService] Rating history fetch skipped/failed for ${cleanHandle}: ${rateErr.message}`);
    }

    return processCodeforcesData(cleanHandle, userInfo, submissions, ratingHistory);
  } catch (error) {
    if (error.code === 'CODEFORCES_PROFILE_NOT_FOUND' || error.code === 'CODEFORCES_INVALID_HANDLE') {
      throw error;
    }

    const comment = error.response?.data?.comment || '';
    if (comment.toLowerCase().includes('not found') || error.response?.status === 404) {
      const notFoundErr = new Error('Codeforces profile not found');
      notFoundErr.code = 'CODEFORCES_PROFILE_NOT_FOUND';
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    if (error.response?.status === 429 || comment.toLowerCase().includes('limit exceeded')) {
      logger.warn(`[CodeforcesService] Rate limit reached for ${cleanHandle}`);
      const rateErr = new Error('Codeforces rate limit exceeded. Please try again shortly.');
      rateErr.code = 'CODEFORCES_RATE_LIMIT';
      rateErr.status = 429;
      throw rateErr;
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      logger.warn(`[CodeforcesService] Timeout for ${cleanHandle}`);
      const timeoutErr = new Error('Codeforces API request timed out');
      timeoutErr.code = 'CODEFORCES_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }

    logger.warn(`[CodeforcesService] API error for ${cleanHandle}: ${error.message}`);
    const apiErr = new Error('Failed to fetch Codeforces profile');
    apiErr.code = 'CODEFORCES_API_ERROR';
    apiErr.status = 502;
    apiErr.original = error.message;
    throw apiErr;
  }
}

module.exports = {
  isValidCodeforcesHandle,
  fetchCodeforcesProfile,
  processCodeforcesData,
  getRatingBucket,
};
