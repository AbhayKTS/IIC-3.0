const express = require('express');

const {
  createInstitution,
  listInstitutions,
  updateInstitution,
  deleteInstitution,
  promoteAdminFaculty,
} = require('../../controllers/superadmin.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireSuperAdmin } = require('../../middleware/requireSuperAdmin');

const router = express.Router();

router.use(verifyFirebaseToken, attachUserProfile, requireSuperAdmin);

router.post('/institutions', createInstitution);
router.get('/institutions', listInstitutions);
router.patch('/institutions/:id', updateInstitution);
router.delete('/institutions/:id', deleteInstitution);
router.post('/promote-admin', promoteAdminFaculty);

module.exports = router;
