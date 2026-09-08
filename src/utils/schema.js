const DEFAULT_SCHEMA_VERSION = 1;

const getSchemaVersion = (doc) => {
  if (doc && Number.isFinite(doc.schemaVersion)) return doc.schemaVersion;
  return DEFAULT_SCHEMA_VERSION;
};

const normalizeStudentProfile = (profile = {}) => {
  const schemaVersion = getSchemaVersion(profile);
  const overallScore = Number.isFinite(profile.overallScore)
    ? profile.overallScore
    : Number.isFinite(profile.totalScore)
      ? profile.totalScore
      : 0;
  const totalScore = Number.isFinite(profile.totalScore)
    ? profile.totalScore
    : overallScore;
  const profileVisibility = profile.profileVisibility === 'collegeOnly' ? 'collegeOnly' : 'public';

  return {
    ...profile,
    schemaVersion,
    overallScore,
    totalScore,
    profileVisibility,
  };
};

const normalizeStudentLeaderboard = (entry = {}) => {
  const schemaVersion = getSchemaVersion(entry);
  const overallScore = Number.isFinite(entry.overallScore)
    ? entry.overallScore
    : Number.isFinite(entry.totalScore)
      ? entry.totalScore
      : 0;
  const totalScore = Number.isFinite(entry.totalScore)
    ? entry.totalScore
    : overallScore;

  return {
    ...entry,
    schemaVersion,
    overallScore,
    totalScore,
  };
};

module.exports = {
  DEFAULT_SCHEMA_VERSION,
  getSchemaVersion,
  normalizeStudentProfile,
  normalizeStudentLeaderboard,
};