const admin = require('../../src/services/firebaseAdmin');
const db = require('../../src/services/firestore');
const { logAudit } = require('../../src/services/audit.service');

const DEFAULT_BATCH_SIZE = 300;

const getSchemaVersion = (doc) => {
  if (doc && Number.isFinite(doc.schemaVersion)) return doc.schemaVersion;
  return 1;
};

const runMigration = async ({
  collectionName,
  fromVersion,
  toVersion,
  transformFunction,
  batchSize = DEFAULT_BATCH_SIZE,
  executedBy = 'migration',
  migrationName = 'unnamed_migration',
  dryRun = false,
}) => {
  if (!collectionName) throw new Error('collectionName is required');
  if (!Number.isFinite(fromVersion)) throw new Error('fromVersion must be a number');
  if (!Number.isFinite(toVersion)) throw new Error('toVersion must be a number');
  if (typeof transformFunction !== 'function') throw new Error('transformFunction is required');

  let lastDoc = null;
  let documentsUpdated = 0;

  while (true) {
    let query = db
      .collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchUpdated = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const currentVersion = getSchemaVersion(data);

      if (currentVersion !== fromVersion) return;

      const update = transformFunction({ id: doc.id, data });
      if (!update || typeof update !== 'object' || Object.keys(update).length === 0) return;

      const payload = {
        ...update,
        schemaVersion: toVersion,
        updatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        batch.set(doc.ref, payload, { merge: true });
      }

      batchUpdated += 1;
    });

    if (batchUpdated > 0 && !dryRun) {
      await batch.commit();
    }

    documentsUpdated += batchUpdated;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  await logAudit({
    actionType: 'migration_run',
    performedBy: executedBy,
    performedByRole: 'system',
    targetType: 'migration',
    metadata: {
      migrationName,
      collectionName,
      fromVersion,
      toVersion,
      documentsUpdated,
      dryRun,
    },
  });

  return {
    migrationName,
    collectionName,
    fromVersion,
    toVersion,
    documentsUpdated,
    dryRun,
  };
};

module.exports = {
  runMigration,
};
