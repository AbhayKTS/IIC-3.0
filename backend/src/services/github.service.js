const axios = require('axios');
const logger = require('../utils/logger');

const GITHUB_API_BASE = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 6000;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,39}$/;

/**
 * Strips URL prefixes, slashes, and leading '@' signs from GitHub username inputs.
 * @param {string} username
 * @returns {string}
 */
function cleanGithubUsername(username) {
  if (typeof username !== 'string') return '';
  let cleaned = username.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
  cleaned = cleaned.split('/')[0].split('?')[0].trim();
  cleaned = cleaned.replace(/^@+/, '');
  return cleaned;
}

/**
 * Validates a GitHub username format.
 * @param {string} username
 * @returns {boolean}
 */
function isValidGithubUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const cleaned = cleanGithubUsername(username);
  return USERNAME_REGEX.test(cleaned);
}

/**
 * Fetches public GitHub user profile data.
 * @param {string} rawUsername
 * @returns {Promise<object>}
 */
async function fetchGithubProfile(rawUsername) {
  const username = cleanGithubUsername(rawUsername);
  if (!isValidGithubUsername(username)) {
    const err = new Error('Invalid GitHub username format');
    err.code = 'GITHUB_INVALID_USERNAME';
    err.status = 400;
    throw err;
  }

  try {
    const response = await axios.get(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Almadox-SkillEngine/3.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const data = response.data || {};
    const publicRepos = Number(data.public_repos || 0);
    const followers = Number(data.followers || 0);
    const publicGists = Number(data.public_gists || 0);

    // Calculate real data points: repos * 20 + followers * 5 + gists * 10
    const points = (publicRepos * 20) + (followers * 5) + (publicGists * 10);

    return {
      username,
      name: data.name || username,
      profileUrl: `https://github.com/${encodeURIComponent(username)}`,
      publicRepos,
      followers,
      publicGists,
      points,
      fetchedAt: new Date().toISOString(),
      status: 'connected',
      error: null,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      const notFoundErr = new Error(`GitHub user '${username}' not found`);
      notFoundErr.code = 'GITHUB_USER_NOT_FOUND';
      notFoundErr.status = 404;
      throw notFoundErr;
    }
    logger.warn(`[GithubService] Fetch warning for ${username}: ${err.message}`);
    return {
      username,
      name: username,
      profileUrl: `https://github.com/${encodeURIComponent(username)}`,
      publicRepos: 0,
      followers: 0,
      publicGists: 0,
      points: 50, // Base points for connected handle
      fetchedAt: new Date().toISOString(),
      status: 'connected',
      error: err.message,
    };
  }
}

module.exports = {
  cleanGithubUsername,
  isValidGithubUsername,
  fetchGithubProfile,
};
