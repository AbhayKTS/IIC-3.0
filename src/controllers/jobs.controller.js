const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString, isValidDateString, isStringArray, clampArray } = require('../utils/validation');
const { createNotification } = require('../services/notifications.service');
const { logAudit } = require('../services/audit.service');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');
const { normalizeStudentProfile } = require('../utils/schema');

const JOB_TYPES = ['internship', 'fulltime', 'contract'];
const JOB_STATUSES = ['open', 'closed'];
const REQUIRED_SKILLS_LIMIT = 40;

const normalizeEligibleColleges = (value) => {
  if (value === 'all') return 'all';
  if (isStringArray(value)) return value.map((item) => item.trim());
  return null;
};

const buildJobPayload = (payload) => {
  const minScore = Number.isFinite(payload.minimumScore)
    ? payload.minimumScore
    : payload.minimumScore ? Number(payload.minimumScore) : null;

  const requiredSkills = isStringArray(payload.requiredSkills)
    ? clampArray(payload.requiredSkills, REQUIRED_SKILLS_LIMIT)
    : [];

  return {
    companyId: isNonEmptyString(payload.companyId) ? payload.companyId.trim() : null,
    title: isNonEmptyString(payload.title) ? payload.title.trim() : null,
    description: isNonEmptyString(payload.description) ? payload.description.trim() : null,
    jobType: JOB_TYPES.includes(payload.jobType) ? payload.jobType : null,
    eligibleColleges: normalizeEligibleColleges(payload.eligibleColleges),
    minimumScore: Number.isFinite(minScore) ? minScore : null,
    requiredSkills,
    status: JOB_STATUSES.includes(payload.status) ? payload.status : 'open',
    applicationDeadline: isValidDateString(payload.applicationDeadline)
      ? payload.applicationDeadline
      : null,
  };
};

const createJobPost = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.RECRUITER) {
      throw new CustomError('Recruiter only', 403, 'recruiter_only');
    }

    const payload = buildJobPayload(req.body || {});

    if (!payload.companyId || !payload.title || !payload.description || !payload.jobType) {
      throw new CustomError('companyId, title, description, and jobType are required', 400, 'invalid_payload');
    }

    if (!payload.eligibleColleges) {
      throw new CustomError('eligibleColleges is required', 400, 'invalid_payload');
    }

    if (Array.isArray(payload.eligibleColleges) && payload.eligibleColleges.length === 0) {
      throw new CustomError('eligibleColleges cannot be empty', 400, 'invalid_payload');
    }

    if (!payload.applicationDeadline) {
      throw new CustomError('applicationDeadline is required', 400, 'invalid_payload');
    }

    const companyRef = db.collection('companies').doc(payload.companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      throw new CustomError('Company not found', 404, 'company_missing');
    }

    const company = companySnap.data();

    if (company.createdBy !== actor.uid) {
      throw new CustomError('Recruiter does not own this company', 403, 'company_forbidden');
    }

    if (company.verifiedStatus && company.verifiedStatus !== 'verified') {
      throw new CustomError('Company not verified', 403, 'company_unverified');
    }

    const jobRef = db.collection('jobPosts').doc();
    const now = new Date().toISOString();

    const jobDoc = {
      jobId: jobRef.id,
      companyId: payload.companyId,
      title: payload.title,
      description: payload.description,
      jobType: payload.jobType,
      eligibleColleges: payload.eligibleColleges,
      minimumScore: payload.minimumScore,
      requiredSkills: payload.requiredSkills,
      status: payload.status,
      applicationDeadline: payload.applicationDeadline,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    await jobRef.set(jobDoc);

    await logAudit({
      actionType: 'job_post_created',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: jobRef.id,
      targetType: 'job',
      metadata: { companyId: payload.companyId },
    });

    await incrementPlatformStats({ totalJobPosts: 1 });

    return ok(res, { job: jobDoc });
  } catch (error) {
    return next(error);
  }
};

const applyToJob = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const jobId = req.params.jobId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Student college missing', 400, 'college_missing');
    }

    if (!jobId) {
      throw new CustomError('Job id is required', 400, 'invalid_payload');
    }

    const jobRef = db.collection('jobPosts').doc(jobId);
    const applicationId = `${jobId}_${actor.uid}`;
    const applicationRef = db.collection('jobApplications').doc(applicationId);
    const profileRef = db.collection('studentProfiles').doc(actor.uid);

    await db.runTransaction(async (transaction) => {
      const jobSnap = await transaction.get(jobRef);
      const applicationSnap = await transaction.get(applicationRef);
      const profileSnap = await transaction.get(profileRef);

      if (!jobSnap.exists) {
        throw new CustomError('Job not found', 404, 'job_missing');
      }

      const job = jobSnap.data();

      if (job.status !== 'open') {
        throw new CustomError('Job is closed', 403, 'job_closed');
      }

      if (job.applicationDeadline && Date.parse(job.applicationDeadline) < Date.now()) {
        throw new CustomError('Application deadline passed', 403, 'deadline_passed');
      }

      if (applicationSnap.exists) {
        throw new CustomError('Already applied', 409, 'already_applied');
      }

      if (job.eligibleColleges !== 'all') {
        const eligible = Array.isArray(job.eligibleColleges)
          ? job.eligibleColleges.includes(actor.collegeId)
          : false;
        if (!eligible) {
          throw new CustomError('College not eligible', 403, 'college_ineligible');
        }
      }

      if (!profileSnap.exists) {
        throw new CustomError('Student profile not found', 404, 'profile_missing');
      }

      const profile = normalizeStudentProfile(profileSnap.data());

      if (job.minimumScore !== null && profile.overallScore < job.minimumScore) {
        throw new CustomError('Minimum score not met', 403, 'score_insufficient');
      }

      transaction.set(applicationRef, {
        applicationId,
        jobId,
        userId: actor.uid,
        collegeId: actor.collegeId,
        applicationStatus: 'applied',
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        studentSnapshot: {
          totalScore: profile.totalScore || 0,
          overallScore: profile.overallScore || profile.totalScore || 0,
          skills: Array.isArray(profile.skills) ? profile.skills : [],
        },
      });
    });

    await incrementPlatformStats({ totalApplications: 1 });
    await incrementCollegeStats(actor.collegeId, { totalApplications: 1 });

    return ok(res, { jobId, applied: true });
  } catch (error) {
    return next(error);
  }
};

const shortlistApplication = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const { jobId, applicationId } = req.params;

    if (!actor || actor.role !== Roles.RECRUITER) {
      throw new CustomError('Recruiter only', 403, 'recruiter_only');
    }

    if (!jobId || !applicationId) {
      throw new CustomError('Job id and application id are required', 400, 'invalid_payload');
    }

    const jobRef = db.collection('jobPosts').doc(jobId);
    const applicationRef = db.collection('jobApplications').doc(applicationId);

    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      throw new CustomError('Job not found', 404, 'job_missing');
    }

    const job = jobSnap.data();
    const companyRef = db.collection('companies').doc(job.companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      throw new CustomError('Company not found', 404, 'company_missing');
    }

    const company = companySnap.data();
    if (company.createdBy !== actor.uid) {
      throw new CustomError('Recruiter does not own this job', 403, 'job_forbidden');
    }

    const applicationSnap = await applicationRef.get();

    if (!applicationSnap.exists) {
      throw new CustomError('Application not found', 404, 'application_missing');
    }

    const application = applicationSnap.data();

    if (application.jobId !== jobId) {
      throw new CustomError('Application does not match job', 400, 'application_mismatch');
    }

    await applicationRef.set({
      applicationStatus: 'shortlisted',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await createNotification({
      userId: application.userId,
      type: 'job',
      title: 'Application shortlisted',
      message: 'Your job application has been shortlisted.',
      referenceId: jobId,
    });

    await logAudit({
      actionType: 'job_shortlisted',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: applicationId,
      targetType: 'job',
      metadata: { jobId },
    });

    return ok(res, { jobId, applicationId, status: 'shortlisted' });
  } catch (error) {
    return next(error);
  }
};

const listJobApplications = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const jobId = req.params.jobId;
    const { applicationStatus, collegeId } = req.query || {};

    if (!actor || actor.role !== Roles.RECRUITER) {
      throw new CustomError('Recruiter only', 403, 'recruiter_only');
    }

    if (!jobId) {
      throw new CustomError('Job id is required', 400, 'invalid_payload');
    }

    const jobRef = db.collection('jobPosts').doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      throw new CustomError('Job not found', 404, 'job_missing');
    }

    const job = jobSnap.data();
    const companyRef = db.collection('companies').doc(job.companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      throw new CustomError('Company not found', 404, 'company_missing');
    }

    const company = companySnap.data();
    if (company.createdBy !== actor.uid) {
      throw new CustomError('Recruiter does not own this job', 403, 'job_forbidden');
    }

    let query = db.collection('jobApplications').where('jobId', '==', jobId);

    if (applicationStatus) {
      query = query.where('applicationStatus', '==', applicationStatus);
    }

    if (collegeId && isNonEmptyString(collegeId)) {
      query = query.where('collegeId', '==', collegeId.trim());
    }

    const snapshot = await query.get();
    const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return ok(res, { applications });
  } catch (error) {
    return next(error);
  }
};

const listStudentApplications = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    const snapshot = await db
      .collection('jobApplications')
      .where('userId', '==', actor.uid)
      .get();

    const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return ok(res, { applications });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createJobPost,
  applyToJob,
  shortlistApplication,
  listJobApplications,
  listStudentApplications,
};
