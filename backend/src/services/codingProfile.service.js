const db = require('./firestore');
const logger = require('../utils/logger');
const { fetchLeetCodeProfile, isValidLeetCodeUsername } = require('./leetcode.service');
const { fetchCodeforcesProfile, isValidCodeforcesHandle } = require('./codeforces.service');

const DEFAULT_CACHE_TTL_MS = Number(process.env.CODING_PROFILE_CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour

/**
 * Checks if a profile timestamp is fresh within the configured TTL.
 * @param {string|null} fetchedAt
 * @param {number} ttlMs
 * @returns {boolean}
 */
function isFresh(fetchedAt, ttlMs = DEFAULT_CACHE_TTL_MS) {
  if (!fetchedAt) return false;
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < ttlMs;
}

/**
 * Maps raw coding tags and topics to normalized skill evidence for candidate matching.
 * @param {object} leetcode
 * @param {object} codeforces
 * @returns {object} Normalized evidence dictionary
 */
function extractCodingSkillEvidence(leetcode, codeforces) {
  const evidence = {};

  // LeetCode skills
  if (leetcode && leetcode.skills && typeof leetcode.skills === 'object') {
    for (const [rawSkill, count] of Object.entries(leetcode.skills)) {
      const normalizedKey = rawSkill.trim().toLowerCase();
      evidence[normalizedKey] = (evidence[normalizedKey] || 0) + Number(count || 0);
    }
  }

  // Codeforces tags
  if (codeforces && codeforces.tags && typeof codeforces.tags === 'object') {
    for (const [rawTag, count] of Object.entries(codeforces.tags)) {
      const normalizedKey = rawTag.trim().toLowerCase();
      evidence[normalizedKey] = (evidence[normalizedKey] || 0) + Number(count || 0);
    }
  }

  // Common high-level aliases
  if (evidence['dynamic programming'] || evidence['dp']) {
    const dpCount = (evidence['dynamic programming'] || 0) + (evidence['dp'] || 0);
    evidence['dynamic programming'] = dpCount;
    evidence['algorithms'] = (evidence['algorithms'] || 0) + Math.round(dpCount * 0.5);
  }

  if (evidence['graphs'] || evidence['graph theory']) {
    const graphCount = (evidence['graphs'] || 0) + (evidence['graph theory'] || 0);
    evidence['graphs'] = graphCount;
    evidence['data structures'] = (evidence['data structures'] || 0) + Math.round(graphCount * 0.5);
  }

  if (evidence['trees'] || evidence['binary tree'] || evidence['tree']) {
    const treeCount = (evidence['trees'] || 0) + (evidence['binary tree'] || 0) + (evidence['tree'] || 0);
    evidence['data structures'] = (evidence['data structures'] || 0) + Math.round(treeCount * 0.5);
  }

  return evidence;
}

/**
 * Retrieves the current coding profiles for a student from Firestore.
 * @param {string} studentId
 * @returns {Promise<object>}
 */
async function getStoredCodingProfiles(studentId) {
  if (!studentId) return { leetcode: null, codeforces: null };

  try {
    const profileSnap = await db.collection('studentProfiles').doc(studentId).get();
    if (profileSnap.exists) {
      const data = profileSnap.data() || {};
      if (data.codingProfiles && typeof data.codingProfiles === 'object') {
        return data.codingProfiles;
      }
    }
  } catch (err) {
    logger.warn(`[CodingProfileService] Failed reading studentProfiles for ${studentId}: ${err.message}`);
  }

  return { leetcode: null, codeforces: null };
}

/**
 * Saves updated codingProfiles to both studentProfiles and users collections.
 * @param {string} studentId
 * @param {object} codingProfiles
 */
async function persistCodingProfiles(studentId, codingProfiles) {
  if (!studentId) return;

  const now = new Date().toISOString();
  const evidence = extractCodingSkillEvidence(codingProfiles.leetcode, codingProfiles.codeforces);

  try {
    const profileRef = db.collection('studentProfiles').doc(studentId);
    await profileRef.set(
      {
        codingProfiles,
        codingSkillEvidence: evidence,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    logger.warn(`[CodingProfileService] studentProfiles write warning for ${studentId}: ${err.message}`);
  }

  try {
    const userRef = db.collection('users').doc(studentId);
    await userRef.set(
      {
        codingProfiles,
        codingSkillEvidence: evidence,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    logger.warn(`[CodingProfileService] users write warning for ${studentId}: ${err.message}`);
  }
}

/**
 * Synchronizes coding profiles for a student with given handles or refreshes existing handles.
 * @param {string} studentId
 * @param {object} options
 * @param {string} [options.leetcodeUsername]
 * @param {string} [options.codeforcesHandle]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<object>} Normalized coding profiles
 */
async function syncStudentCodingProfiles(studentId, options = {}) {
  const { leetcodeUsername, codeforcesHandle, forceRefresh = false } = options;

  // 1. Get existing stored profiles
  const stored = await getStoredCodingProfiles(studentId);

  const targetLeetcode = leetcodeUsername !== undefined
    ? (leetcodeUsername ? String(leetcodeUsername).trim() : null)
    : stored.leetcode?.username || null;

  const targetCodeforces = codeforcesHandle !== undefined
    ? (codeforcesHandle ? String(codeforcesHandle).trim() : null)
    : stored.codeforces?.handle || null;

  const results = {
    leetcode: stored.leetcode || null,
    codeforces: stored.codeforces || null,
  };

  const tasks = [];

  // 2. Determine LeetCode action
  if (targetLeetcode) {
    const hasFreshData = !forceRefresh &&
      stored.leetcode?.username?.toLowerCase() === targetLeetcode.toLowerCase() &&
      stored.leetcode?.status === 'connected' &&
      isFresh(stored.leetcode?.fetchedAt);

    if (hasFreshData) {
      results.leetcode = stored.leetcode;
    } else {
      tasks.push(
        (async () => {
          try {
            const data = await fetchLeetCodeProfile(targetLeetcode);
            results.leetcode = data;
          } catch (err) {
            logger.warn(`[CodingProfileService] LeetCode fetch failed for ${targetLeetcode}: ${err.message}`);
            results.leetcode = {
              ...(stored.leetcode || {}),
              username: targetLeetcode,
              profileUrl: `https://leetcode.com/u/${encodeURIComponent(targetLeetcode)}/`,
              fetchedAt: new Date().toISOString(),
              source: 'public_profile',
              status: 'error',
              error: err.message || 'Failed to fetch LeetCode profile',
              totalSolved: stored.leetcode?.totalSolved || 0,
              easy: stored.leetcode?.easy || 0,
              medium: stored.leetcode?.medium || 0,
              hard: stored.leetcode?.hard || 0,
              languages: stored.leetcode?.languages || {},
              skills: stored.leetcode?.skills || {},
            };
          }
        })()
      );
    }
  } else if (leetcodeUsername === null || leetcodeUsername === '') {
    // Explicitly unlinked
    results.leetcode = null;
  }

  // 3. Determine Codeforces action
  if (targetCodeforces) {
    const hasFreshData = !forceRefresh &&
      stored.codeforces?.handle?.toLowerCase() === targetCodeforces.toLowerCase() &&
      stored.codeforces?.status === 'connected' &&
      isFresh(stored.codeforces?.fetchedAt);

    if (hasFreshData) {
      results.codeforces = stored.codeforces;
    } else {
      tasks.push(
        (async () => {
          try {
            const data = await fetchCodeforcesProfile(targetCodeforces);
            results.codeforces = data;
          } catch (err) {
            logger.warn(`[CodingProfileService] Codeforces fetch failed for ${targetCodeforces}: ${err.message}`);
            results.codeforces = {
              ...(stored.codeforces || {}),
              handle: targetCodeforces,
              profileUrl: `https://codeforces.com/profile/${encodeURIComponent(targetCodeforces)}`,
              fetchedAt: new Date().toISOString(),
              source: 'official_api',
              status: 'error',
              error: err.message || 'Failed to fetch Codeforces profile',
              totalSolved: stored.codeforces?.totalSolved || 0,
              rating: stored.codeforces?.rating || null,
              maxRating: stored.codeforces?.maxRating || null,
              rank: stored.codeforces?.rank || null,
              maxRank: stored.codeforces?.maxRank || null,
              ratingBuckets: stored.codeforces?.ratingBuckets || {},
              tags: stored.codeforces?.tags || {},
              languages: stored.codeforces?.languages || {},
              contests: stored.codeforces?.contests || { participated: 0, rated: 0 },
            };
          }
        })()
      );
    }
  } else if (codeforcesHandle === null || codeforcesHandle === '') {
    // Explicitly unlinked
    results.codeforces = null;
  }

  // 4. Run external queries in parallel
  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  // 5. Persist updated coding profiles to Firestore
  await persistCodingProfiles(studentId, results);

  return results;
}

module.exports = {
  isFresh,
  extractCodingSkillEvidence,
  getStoredCodingProfiles,
  persistCodingProfiles,
  syncStudentCodingProfiles,
};
