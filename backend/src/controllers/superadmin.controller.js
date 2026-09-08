const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles, FacultySubRoles } = require('../utils/roles');
const { logAudit } = require('../services/audit.service');

const assertSuperAdmin = (actor) => {
  if (!actor || actor.platformRole !== 'superAdmin') {
    throw new CustomError('Super admin only', 403, 'superadmin_only');
  }
};

const createInstitution = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    assertSuperAdmin(actor);

    const { name, domain, contactEmail } = req.body || {};

    if (!name || !name.trim()) {
      throw new CustomError('Institution name is required', 400, 'name_required');
    }
    if (!domain || !domain.trim()) {
      throw new CustomError('Institution domain is required', 400, 'domain_required');
    }

    const normalizedDomain = domain.trim().toLowerCase();

    // Check if domain already exists on another college doc
    const existingSnap = await db
      .collection('colleges')
      .where('domain', '==', normalizedDomain)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      throw new CustomError('College domain already exists', 409, 'domain_exists');
    }

    const collegeRef = db.collection('colleges').doc();
    const collegeId = collegeRef.id;
    const now = new Date().toISOString();

    const collegeDoc = {
      id: collegeId,
      collegeId,
      name: name.trim(),
      domain: normalizedDomain,
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await collegeRef.set(collegeDoc);

    await logAudit({
      actionType: 'institution_created',
      performedBy: actor.uid,
      performedByRole: actor.platformRole || actor.role || 'superAdmin',
      targetId: collegeId,
      targetType: 'college',
      metadata: { name: collegeDoc.name, domain: normalizedDomain, contactEmail: collegeDoc.contactEmail },
    });

    return ok(res, collegeDoc, { message: 'Institution created successfully' });
  } catch (error) {
    return next(error);
  }
};

const listInstitutions = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    assertSuperAdmin(actor);

    const snapshot = await db.collection('colleges').get();
    const colleges = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const collegeId = doc.id;

      // Check student count from collegeStats or users
      let studentCount = 0;
      const statsDoc = await db.collection('collegeStats').doc(collegeId).get();
      if (statsDoc.exists && typeof statsDoc.data().totalStudents === 'number') {
        studentCount = statsDoc.data().totalStudents;
      } else {
        const studentUsersSnap = await db
          .collection('users')
          .where('collegeId', '==', collegeId)
          .where('role', '==', Roles.STUDENT)
          .get();
        studentCount = studentUsersSnap.size;
      }

      colleges.push({
        id: collegeId,
        collegeId,
        ...data,
        studentCount,
      });
    }

    return ok(res, colleges);
  } catch (error) {
    return next(error);
  }
};

const updateInstitution = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    assertSuperAdmin(actor);

    const { id } = req.params;
    if (!id) {
      throw new CustomError('College ID is required', 400, 'id_required');
    }

    const collegeRef = db.collection('colleges').doc(id);
    const collegeSnap = await collegeRef.get();

    if (!collegeSnap.exists) {
      throw new CustomError('College not found', 404, 'college_not_found');
    }

    const { name, isActive, contactEmail } = req.body || {};
    const updates = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        throw new CustomError('Institution name cannot be empty', 400, 'name_invalid');
      }
      updates.name = name.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (contactEmail !== undefined) {
      updates.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;
    }

    await collegeRef.set(updates, { merge: true });

    const updatedSnap = await collegeRef.get();
    const updatedData = { id: collegeRef.id, collegeId: collegeRef.id, ...updatedSnap.data() };

    await logAudit({
      actionType: 'institution_updated',
      performedBy: actor.uid,
      performedByRole: actor.platformRole || actor.role || 'superAdmin',
      targetId: id,
      targetType: 'college',
      metadata: updates,
    });

    return ok(res, updatedData);
  } catch (error) {
    return next(error);
  }
};

const deleteInstitution = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    assertSuperAdmin(actor);

    const { id } = req.params;
    if (!id) {
      throw new CustomError('College ID is required', 400, 'id_required');
    }

    const collegeRef = db.collection('colleges').doc(id);
    const collegeSnap = await collegeRef.get();

    if (!collegeSnap.exists) {
      throw new CustomError('College not found', 404, 'college_not_found');
    }

    // Soft delete via isActive: false, never hard-delete if students exist under it
    const updates = {
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await collegeRef.set(updates, { merge: true });

    await logAudit({
      actionType: 'institution_updated',
      performedBy: actor.uid,
      performedByRole: actor.platformRole || actor.role || 'superAdmin',
      targetId: id,
      targetType: 'college',
      metadata: { deleted: true, softDelete: true, isActive: false },
    });

    return ok(res, { id, collegeId: id, isActive: false, deleted: true });
  } catch (error) {
    return next(error);
  }
};

const promoteAdminFaculty = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    assertSuperAdmin(actor);

    const { collegeId, uid, email } = req.body || {};

    if (!collegeId) {
      throw new CustomError('collegeId is required', 400, 'college_id_required');
    }
    if (!uid && !email) {
      throw new CustomError('uid or email is required', 400, 'target_user_required');
    }

    const collegeRef = db.collection('colleges').doc(collegeId);
    const collegeSnap = await collegeRef.get();
    if (!collegeSnap.exists) {
      throw new CustomError('College not found', 404, 'college_not_found');
    }

    let targetUid = uid;
    let targetEmail = email ? email.trim().toLowerCase() : null;

    if (!targetUid && targetEmail) {
      const userByEmailSnap = await db
        .collection('users')
        .where('email', '==', targetEmail)
        .limit(1)
        .get();

      if (!userByEmailSnap.empty) {
        targetUid = userByEmailSnap.docs[0].id;
        targetEmail = userByEmailSnap.docs[0].data().email || targetEmail;
      }
    }

    if (!targetUid) {
      targetUid = `promoted_${Date.now()}`;
    }

    const now = new Date().toISOString();
    const userUpdates = {
      uid: targetUid,
      role: Roles.FACULTY,
      subRole: FacultySubRoles.ADMIN,
      collegeId,
      verificationStatus: 'verified',
      updatedAt: now,
    };
    if (targetEmail) {
      userUpdates.email = targetEmail;
    }

    await db.collection('users').doc(targetUid).set(userUpdates, { merge: true });

    if (targetEmail) {
      const overrideId = targetEmail.replace(/[^a-z0-9]/gi, '_');
      await db.collection('roleOverrides').doc(overrideId).set({
        email: targetEmail,
        role: Roles.FACULTY,
        subRole: FacultySubRoles.ADMIN,
        collegeId,
        verificationStatus: 'verified',
        updatedAt: now,
      }, { merge: true });
    }

    await db.collection('facultyProfiles').doc(targetUid).set({
      userId: targetUid,
      designation: 'Administrator',
      permissionsLevel: FacultySubRoles.ADMIN,
      collegeId,
      updatedAt: now,
    }, { merge: true });

    await logAudit({
      actionType: 'admin_promoted',
      performedBy: actor.uid,
      performedByRole: actor.platformRole || actor.role || 'superAdmin',
      targetId: targetUid,
      targetType: 'user',
      collegeId,
      metadata: { collegeId, email: targetEmail, uid: targetUid },
    });

    return ok(res, {
      uid: targetUid,
      email: targetEmail,
      role: Roles.FACULTY,
      subRole: FacultySubRoles.ADMIN,
      collegeId,
      promoted: true,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createInstitution,
  listInstitutions,
  updateInstitution,
  deleteInstitution,
  promoteAdminFaculty,
};
