jest.mock('../../src/services/firebaseAdmin', () => require('../mocks/firebaseAdmin'));
const blockedDomains = require('../../src/config/blockedDomains');

// Mock Firestore
const mockColleges = [
  { id: 'college_iitd', name: 'IIT Delhi', domain: 'iitd.ac.in' },
  { id: 'college_gla', name: 'GLA University', domain: 'gla.ac.in' },
];

let mockFirestoreCollections = {};

jest.mock('../../src/services/firestore', () => {
  return {
    collection: jest.fn((colName) => {
      const docs = mockFirestoreCollections[colName] || [];
      return {
        doc: jest.fn((id) => {
          const existing = docs.find((d) => d.id === id);
          return {
            id: id || `doc_${Date.now()}`,
            get: jest.fn(async () => ({
              id: id,
              exists: !!existing,
              data: () => existing || {},
            })),
            set: jest.fn(async (data) => data),
          };
        }),
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({
              empty: true,
              docs: [],
            })),
          })),
        })),
        get: jest.fn(async () => ({
          docs: docs.map((d) => ({
            id: d.id,
            data: () => d,
          })),
        })),
      };
    }),
  };
});

const db = require('../../src/services/firestore');
const { signup } = require('../../src/controllers/compat.controller');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createNext = () => jest.fn();

describe('compat.controller - student onboarding domain verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestoreCollections = {
      colleges: [...mockColleges],
      students: [],
      users: [],
      studentProfiles: [],
    };
  });

  describe('blockedDomains configuration', () => {
    it('exports an array containing all required public email domains', () => {
      const expectedDomains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'protonmail.com',
        'icloud.com',
        'rediffmail.com',
      ];
      expect(Array.isArray(blockedDomains)).toBe(true);
      for (const domain of expectedDomains) {
        expect(blockedDomains).toContain(domain);
      }
    });
  });

  describe('rejection path 1: public domain denylist', () => {
    it.each([
      ['gmail.com', 'test.student@gmail.com'],
      ['yahoo.com', 'user@yahoo.com'],
      ['outlook.com', 'candidate@outlook.com'],
      ['hotmail.com', 'coder@hotmail.com'],
      ['protonmail.com', 'anon@protonmail.com'],
      ['icloud.com', 'ios@icloud.com'],
      ['rediffmail.com', 'user@rediffmail.com'],
    ])('rejects registration with %s immediately with code public_domain_not_allowed', async (domain, email) => {
      const req = {
        body: {
          role: 'student',
          name: 'Jane Doe',
          email,
        },
      };
      const res = createRes();
      const next = createNext();

      await signup(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('public_domain_not_allowed');

      // Ensure colleges collection was NOT queried
      expect(db.collection).not.toHaveBeenCalledWith('colleges');
    });
  });

  describe('rejection path 2: college_domain_invalid', () => {
    it('rejects when email domain does not match any registered college and no collegeId is passed', async () => {
      const req = {
        body: {
          role: 'student',
          name: 'Bob Smith',
          email: 'bob@unknown-unregistered-domain.org',
        },
      };
      const res = createRes();
      const next = createNext();

      await signup(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('college_domain_invalid');
    });

    it('rejects when email domain does not match and an invalid collegeId is passed', async () => {
      const req = {
        body: {
          role: 'student',
          name: 'Bob Smith',
          email: 'bob@unknown-domain.org',
          collegeId: 'non_existent_college_id',
        },
      };
      const res = createRes();
      const next = createNext();

      await signup(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('college_domain_invalid');
    });
  });

  describe('successful student signup paths', () => {
    it('allows student registration when email domain matches a registered college', async () => {
      const req = {
        body: {
          role: 'student',
          name: 'Alice Wonder',
          email: 'alice@iitd.ac.in',
        },
      };
      const res = createRes();
      const next = createNext();

      await signup(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledTimes(1);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.collegeId).toBe('college_iitd');
      expect(responseBody.data.email).toBe('alice@iitd.ac.in');
    });

    it('allows student registration when explicit valid collegeId is passed by admin flow', async () => {
      const req = {
        body: {
          role: 'student',
          name: 'Alice Custom',
          email: 'alice@custom-affiliate-domain.org',
          collegeId: 'college_gla',
        },
      };
      const res = createRes();
      const next = createNext();

      await signup(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledTimes(1);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.collegeId).toBe('college_gla');
    });
  });
});
