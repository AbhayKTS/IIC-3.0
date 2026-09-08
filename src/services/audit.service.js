const db = require('./firestore');

const logAudit = async ({
  actionType,
  performedBy,
  performedByRole,
  targetId,
  targetType,
  collegeId,
  metadata,
}) => {
  const logRef = db.collection('auditLogs').doc();

  const logDoc = {
    logId: logRef.id,
    actionType: actionType || 'unknown',
    performedBy: performedBy || 'system',
    performedByRole: performedByRole || 'system',
    targetId: targetId || null,
    targetType: targetType || 'system',
    collegeId: collegeId || null,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  await logRef.set(logDoc);
  return logDoc;
};

module.exports = {
  logAudit,
};
