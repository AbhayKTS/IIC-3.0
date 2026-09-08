jest.mock('../../src/services/firestore', () => {
  const { createFirestoreMock } = require('../mocks/firestore');
  return createFirestoreMock();
});

jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(async () => ({})),
}));

const db = require('../../src/services/firestore');
const { logAudit } = require('../../src/services/audit.service');
const {
  createInstitution,
  listInstitutions,
  updateInstitution,
  deleteInstitution,
  promoteAdminFaculty,
} = require('../../src/controllers/superadmin.controller');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

describe('superadmin.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInstitution', () => {
    it('rejects when actor is not superAdmin', async () => {
      const req = {
        userProfile: { role: 'faculty', subRole: 'adminFaculty' },
        body: { name: 'New College', domain: 'newcollege.edu' },
      };
      const res = createRes();
      const next = createNext();

      await createInstitution(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('superadmin_only');
    });

    it('rejects when name or domain is missing', async () => {
      const req = {
        userProfile: { platformRole: 'superAdmin' },
        body: { domain: 'newcollege.edu' },
      };
      const res = createRes();
      const next = createNext();

      await createInstitution(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('name_required');
    });

    it('rejects when domain already exists', async () => {
      // Mock colleges collection where clause returning existing doc
      const whereMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: 'col_1', data: () => ({ name: 'Existing' }) }],
          }),
        }),
      });
      db.collection.mockReturnValue({
        where: whereMock,
      });

      const req = {
        userProfile: { platformRole: 'superAdmin' },
        body: { name: 'Duplicate College', domain: 'existing.edu' },
      };
      const res = createRes();
      const next = createNext();

      await createInstitution(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('domain_exists');
    });

    it('creates institution and logs audit when valid', async () => {
      const setMock = jest.fn().mockResolvedValue(null);
      const docMock = jest.fn().mockReturnValue({
        id: 'new_col_123',
        set: setMock,
      });
      const whereMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        }),
      });
      db.collection.mockReturnValue({
        where: whereMock,
        doc: docMock,
      });

      const req = {
        userProfile: { uid: 'sa_1', platformRole: 'superAdmin' },
        body: { name: ' Apex University ', domain: ' APEX.EDU ', contactEmail: 'Admin@Apex.Edu' },
      };
      const res = createRes();
      const next = createNext();

      await createInstitution(req, res, next);

      expect(setMock).toHaveBeenCalledTimes(1);
      const savedDoc = setMock.mock.calls[0][0];
      expect(savedDoc.name).toBe('Apex University');
      expect(savedDoc.domain).toBe('apex.edu');
      expect(savedDoc.contactEmail).toBe('admin@apex.edu');
      expect(savedDoc.isActive).toBe(true);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'institution_created',
        performedBy: 'sa_1',
        performedByRole: 'superAdmin',
        targetId: 'new_col_123',
        targetType: 'college',
      }));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          name: 'Apex University',
          domain: 'apex.edu',
          isActive: true,
        }),
      }));
    });
  });

  describe('listInstitutions', () => {
    it('rejects when actor is not superAdmin', async () => {
      const req = { userProfile: { role: 'student' } };
      const res = createRes();
      const next = createNext();

      await listInstitutions(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    it('lists institutions with student counts', async () => {
      const collegeDocs = [
        { id: 'iitd', data: () => ({ name: 'IIT Delhi', domain: 'iitd.ac.in', isActive: true }) },
      ];

      db.collection.mockImplementation((name) => {
        if (name === 'colleges') {
          return {
            get: jest.fn().mockResolvedValue({ docs: collegeDocs }),
          };
        }
        if (name === 'collegeStats') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ totalStudents: 42 }),
              }),
            }),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ size: 0 }),
        };
      });

      const req = { userProfile: { platformRole: 'superAdmin' } };
      const res = createRes();
      const next = createNext();

      await listInstitutions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonPayload = res.json.mock.calls[0][0];
      expect(jsonPayload.success).toBe(true);
      expect(jsonPayload.data).toHaveLength(1);
      expect(jsonPayload.data[0].id).toBe('iitd');
      expect(jsonPayload.data[0].studentCount).toBe(42);
    });
  });

  describe('updateInstitution', () => {
    it('updates institution name and status', async () => {
      const setMock = jest.fn().mockResolvedValue(null);
      const existingData = { name: 'Old Name', isActive: true, domain: 'test.edu' };
      const updatedData = { ...existingData, name: 'New Name', isActive: false };

      const getMock = jest.fn()
        .mockResolvedValueOnce({ exists: true, data: () => existingData })
        .mockResolvedValueOnce({ exists: true, data: () => updatedData });

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          id: 'col_1',
          get: getMock,
          set: setMock,
        }),
      });

      const req = {
        userProfile: { uid: 'sa_1', platformRole: 'superAdmin' },
        params: { id: 'col_1' },
        body: { name: 'New Name', isActive: false },
      };
      const res = createRes();
      const next = createNext();

      await updateInstitution(req, res, next);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name',
        isActive: false,
      }), { merge: true });

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'institution_updated',
        targetId: 'col_1',
      }));

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when college does not exist', async () => {
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      const req = {
        userProfile: { platformRole: 'superAdmin' },
        params: { id: 'nonexistent' },
        body: { name: 'Test' },
      };
      const res = createRes();
      const next = createNext();

      await updateInstitution(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0].statusCode).toBe(404);
    });
  });

  describe('deleteInstitution', () => {
    it('soft deletes institution via isActive: false', async () => {
      const setMock = jest.fn().mockResolvedValue(null);
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          id: 'col_to_delete',
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ name: 'To Delete' }) }),
          set: setMock,
        }),
      });

      const req = {
        userProfile: { uid: 'sa_1', platformRole: 'superAdmin' },
        params: { id: 'col_to_delete' },
      };
      const res = createRes();
      const next = createNext();

      await deleteInstitution(req, res, next);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        isActive: false,
      }), { merge: true });

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'institution_updated',
        targetId: 'col_to_delete',
      }));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ id: 'col_to_delete', isActive: false, deleted: true }),
      }));
    });
  });

  describe('promoteAdminFaculty', () => {
    it('promotes target user by uid or email and logs audit', async () => {
      const userSetMock = jest.fn().mockResolvedValue(null);
      const roleOverrideSetMock = jest.fn().mockResolvedValue(null);
      const facultyProfileSetMock = jest.fn().mockResolvedValue(null);

      db.collection.mockImplementation((name) => {
        if (name === 'colleges') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ name: 'Test College' }) }),
            }),
          };
        }
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({ set: userSetMock }),
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{ id: 'user_123', data: () => ({ email: 'prof@test.edu' }) }],
                }),
              }),
            }),
          };
        }
        if (name === 'roleOverrides') {
          return {
            doc: jest.fn().mockReturnValue({ set: roleOverrideSetMock }),
          };
        }
        if (name === 'facultyProfiles') {
          return {
            doc: jest.fn().mockReturnValue({ set: facultyProfileSetMock }),
          };
        }
        return { doc: jest.fn().mockReturnValue({ set: jest.fn() }) };
      });

      const req = {
        userProfile: { uid: 'sa_1', platformRole: 'superAdmin' },
        body: { collegeId: 'col_123', email: 'prof@test.edu' },
      };
      const res = createRes();
      const next = createNext();

      await promoteAdminFaculty(req, res, next);

      expect(userSetMock).toHaveBeenCalledWith(expect.objectContaining({
        uid: 'user_123',
        role: 'faculty',
        subRole: 'adminFaculty',
        collegeId: 'col_123',
        verificationStatus: 'verified',
      }), { merge: true });

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'admin_promoted',
        performedBy: 'sa_1',
        performedByRole: 'superAdmin',
        targetId: 'user_123',
        collegeId: 'col_123',
      }));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          uid: 'user_123',
          role: 'faculty',
          subRole: 'adminFaculty',
          collegeId: 'col_123',
          promoted: true,
        }),
      }));
    });
  });
});
