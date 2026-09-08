jest.mock('../../src/services/firestore', () => {
  const { createFirestoreMock } = require('../mocks/firestore');
  return createFirestoreMock();
});

const { logAudit } = require('../../src/services/audit.service');
const db = require('../../src/services/firestore');

describe('audit.service', () => {
  it('writes audit log entry', async () => {
    await logAudit({ actionType: 'test_action', performedBy: 'tester' });

    expect(db.collection).toHaveBeenCalledWith('auditLogs');
  });
});
