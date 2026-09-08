const makeDoc = (id, data = {}) => ({ id, data: () => data, exists: true });

const buildDbMock = (state) => {
  const transaction = {
    get: jest.fn(async (ref) => {
      if (ref.__collection === 'studentProfiles') {
        return {
          exists: state.profileExists,
          data: () => state.profileData,
        };
      }

      if (ref.__collection === 'studentLeaderboard') {
        return {
          exists: state.leaderboardExists,
          data: () => state.leaderboardData || {},
        };
      }

      return { exists: true, data: () => ({}) };
    }),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const batchFactory = () => ({
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(async () => null),
  });

  const db = {
    runTransaction: jest.fn(async (fn) => fn(transaction)),
    batch: jest.fn(batchFactory),
    collection: jest.fn((name) => {
      if (name === 'studentProfiles') {
        return {
          doc: jest.fn((id) => ({ __collection: 'studentProfiles', id })),
        };
      }

      if (name === 'studentLeaderboard') {
        return {
          doc: jest.fn((id) => ({ __collection: 'studentLeaderboard', id })),
          where: jest.fn(() => ({
            get: jest.fn(async () => ({
              forEach: (cb) => state.collegeStudents.forEach((item) => cb(makeDoc(item.id, item))),
            })),
          })),
          orderBy: jest.fn(() => ({
            get: jest.fn(async () => ({
              docs: state.rankStudents.map((item) => makeDoc(item.id, item)),
            })),
            limit: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: state.topStudents.map((item) => makeDoc(item.id, item)),
              })),
            })),
          })),
        };
      }

      if (name === 'collegeLeaderboard') {
        return {
          doc: jest.fn((id) => ({ __collection: 'collegeLeaderboard', id, set: jest.fn(async () => null) })),
          orderBy: jest.fn(() => ({
            get: jest.fn(async () => ({
              docs: state.rankColleges.map((item) => makeDoc(item.id, item)),
            })),
          })),
        };
      }

      return {
        doc: jest.fn((id) => ({ __collection: name, id })),
      };
    }),
  };

  return { db, transaction };
};

const loadService = (overrides = {}) => {
  jest.resetModules();

  const state = {
    profileExists: true,
    profileData: {
      collegeId: 'college_1',
      categoryScores: { academic: 1, sports: 2, cultural: 3 },
      skills: ['JS', 'Node'],
    },
    leaderboardExists: false,
    leaderboardData: {},
    collegeStudents: [
      { id: 's1', totalScore: 5 },
      { id: 's2', totalScore: 10 },
    ],
    rankStudents: [
      { id: 's1', userId: 's1', collegeId: 'college_1', totalScore: 10 },
      { id: 's2', userId: 's2', collegeId: 'college_1', totalScore: 8 },
      { id: 's3', collegeId: 'college_2', totalScore: 9 },
    ],
    rankColleges: [
      { id: 'college_1', collegeId: 'college_1', totalCollegeScore: 100 },
      { id: 'college_2', totalCollegeScore: 90 },
    ],
    topStudents: [
      { id: 's1', totalScore: 10 },
      { id: 's2', totalScore: 9 },
    ],
    ...overrides,
  };

  const { db } = buildDbMock(state);

  const incrementPlatformStats = jest.fn(async () => null);
  const incrementCollegeStats = jest.fn(async () => null);
  const logAudit = jest.fn(async () => null);
  const recordSlowQuery = jest.fn();

  jest.doMock('../../src/services/firestore', () => db);
  jest.doMock('../../src/services/stats.service', () => ({
    incrementPlatformStats,
    incrementCollegeStats,
  }));
  jest.doMock('../../src/services/audit.service', () => ({ logAudit }));
  jest.doMock('../../src/services/metrics.service', () => ({ recordSlowQuery }));

  const service = require('../../src/services/leaderboard.service');
  return {
    ...service,
    db,
    mocks: {
      incrementPlatformStats,
      incrementCollegeStats,
      logAudit,
      recordSlowQuery,
    },
  };
};

describe('leaderboard.service', () => {
  it('throws for invalid category', async () => {
    const { updateStudentScore } = loadService();
    await expect(updateStudentScore('student_1', 'invalid', 5)).rejects.toMatchObject({
      code: 'invalid_category',
      statusCode: 400,
    });
  });

  it('throws for non-number points', async () => {
    const { updateStudentScore } = loadService();
    await expect(updateStudentScore('student_1', 'academic', '5')).rejects.toMatchObject({
      code: 'invalid_points',
      statusCode: 400,
    });
  });

  it('throws when profile is missing', async () => {
    const { updateStudentScore } = loadService({ profileExists: false });
    await expect(updateStudentScore('student_1', 'academic', 5)).rejects.toMatchObject({
      code: 'profile_missing',
      statusCode: 404,
    });
  });

  it('throws when profile has no college', async () => {
    const { updateStudentScore } = loadService({
      profileData: {
        collegeId: null,
        categoryScores: { academic: 0, sports: 0, cultural: 0 },
        skills: [],
      },
    });

    await expect(updateStudentScore('student_1', 'academic', 5)).rejects.toMatchObject({
      code: 'college_missing',
      statusCode: 400,
    });
  });

  it('updates score and increments counters for new leaderboard entry', async () => {
    const { updateStudentScore, mocks } = loadService({ leaderboardExists: false });

    const result = await updateStudentScore('student_1', 'academic', 5);

    expect(result).toEqual({ userId: 'student_1', collegeId: 'college_1' });
    expect(mocks.incrementPlatformStats).toHaveBeenCalledWith({ totalScoreSum: 5, totalScoreCount: 1 });
    expect(mocks.incrementCollegeStats).toHaveBeenCalledWith('college_1', {
      totalScoreSum: 5,
      totalScoreCount: 1,
    });
    expect(mocks.logAudit).toHaveBeenCalledTimes(1);
  });

  it('updates score and does not increment count for existing leaderboard entry', async () => {
    const { updateStudentScore, mocks } = loadService({ leaderboardExists: true });

    await updateStudentScore('student_1', 'sports', 3);

    expect(mocks.incrementPlatformStats).toHaveBeenCalledWith({ totalScoreSum: 3, totalScoreCount: 0 });
    expect(mocks.incrementCollegeStats).toHaveBeenCalledWith('college_1', {
      totalScoreSum: 3,
      totalScoreCount: 0,
    });
  });

  it('handles empty college leaderboard snapshot during recalculation', async () => {
    const { updateStudentScore } = loadService({
      leaderboardExists: true,
      collegeStudents: [],
    });

    await expect(updateStudentScore('student_1', 'cultural', 2)).resolves.toEqual({
      userId: 'student_1',
      collegeId: 'college_1',
    });
  });

  it('recalculates rankings', async () => {
    const { recalculateRankings } = loadService();
    const result = await recalculateRankings();
    expect(result).toEqual({ studentsRanked: 3, collegesRanked: 2 });
  });

  it('caches top leaderboard results and records slow query once', async () => {
    const { getTopLeaderboard, db, mocks } = loadService();

    const first = await getTopLeaderboard();
    const second = await getTopLeaderboard();

    expect(first).toEqual(second);
    expect(mocks.recordSlowQuery).toHaveBeenCalledTimes(1);
    expect(db.collection).toHaveBeenCalledWith('studentLeaderboard');
  });
});
