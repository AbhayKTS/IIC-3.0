const { runMigration } = require('./runMigration');

const migrateStudentProfiles = async () => {
  const result = await runMigration({
    collectionName: 'studentProfiles',
    fromVersion: 1,
    toVersion: 2,
    migrationName: 'student_profiles_visibility_overall_score',
    executedBy: 'migration:phase-20',
    transformFunction: ({ data }) => {
      const update = {};

      if (!data.profileVisibility) {
        update.profileVisibility = 'public';
      }

      if (!Number.isFinite(data.overallScore) && Number.isFinite(data.totalScore)) {
        update.overallScore = data.totalScore;
      }

      update.metadata = {
        ...(data.metadata || {}),
        deprecated: {
          ...((data.metadata || {}).deprecated || {}),
          totalScore: true,
        },
      };

      return update;
    },
  });

  // eslint-disable-next-line no-console
  console.log('Migration complete:', result);
};

migrateStudentProfiles().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  process.exit(1);
});
