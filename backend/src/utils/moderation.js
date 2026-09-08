const { moderateContent } = require('../services/ai.service');

/**
 * Synchronous quick-check for Socket.IO (fast regex fallback).
 * Used where we can't await an async call.
 */
const PROFANITY_PATTERNS = [
  /\b(f+u+c+k+|sh+i+t+|a+s+s+h+o+l+e|b+i+t+c+h|d+a+m+n+)\b/i,
  /\b(bastard|bloody|cunt|dick|slut|wanker|whore)\b/i,
  /\b(nigger|faggot|retard|spastic|tranny)\b/i,
  /\b(kill\s+you|murder\s+you|rape\s+you)\b/i,
  /\b(kys|go\s+die|neck\s+yourself)\b/i,
  /\b(porn|xxx|nude|naked|sex\s*chat|send\s*nudes)\b/i,
];

const moderationHookSync = (content) => {
  const text = String(content || '').toLowerCase();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: 'Blocked by content filter' };
    }
  }
  return { allowed: true };
};

/**
 * Async moderation hook — uses Gemini AI when available, falls back to regex.
 */
const moderationHook = async (content) => {
  try {
    return await moderateContent(content);
  } catch {
    return moderationHookSync(content);
  }
};

module.exports = {
  moderationHook,
  moderationHookSync,
};
