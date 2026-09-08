jest.mock('../../src/middleware/verifyFirebaseToken', () => ({
  verifyFirebaseToken: (req, res, next) => {
    const uid = req.headers['x-test-uid'] || 'test_user';
    const email = req.headers['x-test-email'] || 'student@example.edu';
    req.auth = { uid, email, email_verified: true };
    return next();
  },
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/services/firestore');
const { mockCollege, mockStudent, mockFaculty, mockRecruiter, mockAdmin } = require('../fixtures');
const mockStudentTwo = {
  uid: 'student_2',
  email: 'student2@example.edu',
  role: 'student',
  verificationStatus: 'verified',
  collegeId: mockCollege.id,
};

const seedCollege = async () => {
  await db.collection('colleges').doc(mockCollege.id).set({
    domain: mockCollege.domain,
    name: mockCollege.name,
    isActive: true,
  });
};

const seedUser = async (user) => {
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    role: user.role,
    subRole: user.subRole || null,
    collegeId: user.collegeId,
    verificationStatus: user.verificationStatus || 'verified',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

describe('integration flows', () => {
  it('bootstraps student registration and creates profile', async () => {
    await seedCollege();

    const bootstrap = await request(app)
      .post('/api/v1/auth/bootstrap')
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(bootstrap.status).toBe(200);

    const createProfile = await request(app)
      .post('/api/v1/student/profile')
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send({ skills: ['Node.js'] });

    expect(createProfile.status).toBe(200);
  });

  it('verifies student via faculty flow', async () => {
    await seedCollege();
    await seedUser(mockFaculty);
    await seedUser({ ...mockStudent, verificationStatus: 'pending' });

    const verify = await request(app)
      .post('/api/v1/faculty/verify-student')
      .set('x-test-uid', mockFaculty.uid)
      .set('x-test-email', mockFaculty.email)
      .send({ studentId: mockStudent.uid, status: 'verified' });

    expect(verify.status).toBe(200);
  });

  it('creates event and registers student', async () => {
    await seedCollege();
    await seedUser(mockFaculty);
    await seedUser(mockStudent);

    const event = await request(app)
      .post('/api/v1/faculty/events')
      .set('x-test-uid', mockFaculty.uid)
      .set('x-test-email', mockFaculty.email)
      .send({
        title: 'Hackathon',
        description: 'Test event',
        category: 'academic',
        type: 'competition',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        registrationDeadline: new Date(Date.now() + 1800000).toISOString(),
        maxTeamSize: 4,
      });

    expect(event.status).toBe(200);

    const eventId = event.body?.data?.event?.eventId;

    const register = await request(app)
      .post(`/api/v1/student/events/${eventId}/register`)
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(register.status).toBe(200);

    const notifications = await db
      .collection('notifications')
      .where('userId', '==', mockStudent.uid)
      .get();

    expect(notifications.empty).toBe(false);
  });

  it('applies and approves club', async () => {
    await seedCollege();
    await seedUser(mockFaculty);
    await seedUser(mockStudent);

    const apply = await request(app)
      .post('/api/v1/student/clubs/apply')
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send({ name: 'Chess Club', description: 'Fun', category: 'academic' });

    expect(apply.status).toBe(200);

    const clubId = apply.body?.data?.club?.clubId;

    const approve = await request(app)
      .post(`/api/v1/faculty/clubs/${clubId}/approve`)
      .set('x-test-uid', mockFaculty.uid)
      .set('x-test-email', mockFaculty.email)
      .send();

    expect(approve.status).toBe(200);

    const notifications = await db
      .collection('notifications')
      .where('userId', '==', mockStudent.uid)
      .get();

    expect(notifications.empty).toBe(false);
  });

  it('creates job and applies', async () => {
    await seedCollege();
    await seedUser(mockStudent);
    await seedUser(mockRecruiter);

    await db.collection('companies').doc('company_1').set({
      companyId: 'company_1',
      createdBy: mockRecruiter.uid,
      verifiedStatus: 'verified',
    });

    await db.collection('studentProfiles').doc(mockStudent.uid).set({
      userId: mockStudent.uid,
      collegeId: mockStudent.collegeId,
      totalScore: 10,
      overallScore: 10,
      skills: ['Node.js'],
    });

    const job = await request(app)
      .post('/api/v1/recruiter/jobs')
      .set('x-test-uid', mockRecruiter.uid)
      .set('x-test-email', mockRecruiter.email)
      .send({
        companyId: 'company_1',
        title: 'Engineer',
        description: 'Role',
        jobType: 'internship',
        eligibleColleges: 'all',
        minimumScore: 5,
        requiredSkills: ['Node.js'],
        applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(job.status).toBe(200);

    const jobId = job.body?.data?.job?.jobId;

    const apply = await request(app)
      .post(`/api/v1/student/jobs/${jobId}/apply`)
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(apply.status).toBe(200);
  });

  it('runs recruiter search filtering', async () => {
    await seedCollege();
    await seedUser(mockRecruiter);

    await db.collection('studentLeaderboard').doc('student_1').set({
      userId: 'student_1',
      collegeId: mockCollege.id,
      totalScore: 20,
      overallScore: 20,
      searchableSkills: ['node.js'],
      isVerified: true,
    });

    const search = await request(app)
      .get('/api/v1/recruiter/search?skills=node.js&minScore=10')
      .set('x-test-uid', mockRecruiter.uid)
      .set('x-test-email', mockRecruiter.email)
      .send();

    expect(search.status).toBe(200);
  });

  it('enforces role access for admin route', async () => {
    await seedCollege();
    await seedUser(mockStudent);

    const response = await request(app)
      .post('/api/v1/admin/recalculate-rankings')
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(response.status).toBe(403);
  });

  it('blocks non-admin faculty from admin route', async () => {
    await seedCollege();
    await seedUser({
      uid: 'faculty_basic',
      email: 'faculty.basic@example.edu',
      role: 'faculty',
      subRole: 'faculty',
      verificationStatus: 'verified',
      collegeId: mockCollege.id,
    });

    const response = await request(app)
      .post('/api/v1/admin/recalculate-rankings')
      .set('x-test-uid', 'faculty_basic')
      .set('x-test-email', 'faculty.basic@example.edu')
      .send();

    expect(response.status).toBe(403);
  });

  it('blocks student from faculty routes', async () => {
    await seedCollege();
    await seedUser(mockStudent);

    const response = await request(app)
      .get('/api/v1/faculty/pending-students')
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(response.status).toBe(403);
  });

  it('generates analytics snapshot via admin route', async () => {
    await seedCollege();
    await seedUser(mockAdmin);

    const response = await request(app)
      .post('/api/v1/admin/generate-analytics')
      .set('x-test-uid', mockAdmin.uid)
      .set('x-test-email', mockAdmin.email)
      .send();

    expect(response.status).toBe(200);

    const snapshots = await db.collection('analyticsSnapshots').get();
    expect(snapshots.empty).toBe(false);
  });

  it('blocks unverified student from protected route', async () => {
    await seedCollege();
    await seedUser(mockFaculty);
    await seedUser({ ...mockStudent, verificationStatus: 'pending' });

    const event = await request(app)
      .post('/api/v1/faculty/events')
      .set('x-test-uid', mockFaculty.uid)
      .set('x-test-email', mockFaculty.email)
      .send({
        title: 'Workshop',
        description: 'Test event',
        category: 'academic',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        registrationDeadline: new Date(Date.now() + 1800000).toISOString(),
        maxParticipants: 50,
      });

    const eventId = event.body?.data?.event?.eventId;

    const register = await request(app)
      .post(`/api/v1/student/events/${eventId}/register`)
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(register.status).toBe(403);
  });

  it('prevents recruiter from modifying student data', async () => {
    await seedCollege();
    await seedUser(mockRecruiter);

    const response = await request(app)
      .post('/api/v1/student/profile')
      .set('x-test-uid', mockRecruiter.uid)
      .set('x-test-email', mockRecruiter.email)
      .send({ bio: 'should fail' });

    expect(response.status).toBe(403);
  });

  it('creates team, join request, and approval', async () => {
    await seedCollege();
    await seedUser(mockFaculty);
    await seedUser(mockStudent);
    await seedUser(mockStudentTwo);

    const event = await request(app)
      .post('/api/v1/faculty/events')
      .set('x-test-uid', mockFaculty.uid)
      .set('x-test-email', mockFaculty.email)
      .send({
        title: 'Team Event',
        description: 'Team test',
        category: 'academic',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        registrationDeadline: new Date(Date.now() + 1800000).toISOString(),
        isTeamEvent: true,
      });

    const eventId = event.body?.data?.event?.eventId;

    const team = await request(app)
      .post(`/api/v1/student/events/${eventId}/create-team`)
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send({ teamName: 'Team A', maxMembers: 2 });

    expect(team.status).toBe(200);

    const teamId = team.body?.data?.teamId;

    const joinRequest = await request(app)
      .post(`/api/v1/student/teams/${teamId}/request-join`)
      .set('x-test-uid', mockStudentTwo.uid)
      .set('x-test-email', mockStudentTwo.email)
      .send();

    expect(joinRequest.status).toBe(200);

    const requestId = `${teamId}_${mockStudentTwo.uid}`;

    const approve = await request(app)
      .post(`/api/v1/student/teams/${teamId}/approve/${requestId}`)
      .set('x-test-uid', mockStudent.uid)
      .set('x-test-email', mockStudent.email)
      .send();

    expect(approve.status).toBe(200);
  });
});
