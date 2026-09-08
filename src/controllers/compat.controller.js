const db = require('../services/firestore');
const { ok } = require('../utils/response');

const getDoc = async (collection, id) => {
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

const listDocs = async (collection, filter) => {
  let query = db.collection(collection);
  if (filter && filter.field && filter.value !== undefined && filter.value !== null) {
    query = query.where(filter.field, '==', filter.value);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const createDoc = async (collection, payload, id) => {
  const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
  const doc = { id: ref.id, ...payload };
  await ref.set(doc);
  return doc;
};

const updateDoc = async (collection, id, payload) => {
  const ref = db.collection(collection).doc(id);
  await ref.set(payload, { merge: true });
  return getDoc(collection, id);
};

const deleteDoc = async (collection, id) => {
  await db.collection(collection).doc(id).delete();
};

module.exports = {
  // Colleges
  async listColleges(req, res, next) {
    try {
      const colleges = await listDocs('colleges');
      return ok(res, colleges);
    } catch (error) {
      return next(error);
    }
  },
  async getCollege(req, res, next) {
    try {
      const college = await getDoc('colleges', req.params.id);
      return ok(res, college);
    } catch (error) {
      return next(error);
    }
  },

  // Students
  async listStudents(req, res, next) {
    try {
      const students = await listDocs('students');
      return ok(res, students);
    } catch (error) {
      return next(error);
    }
  },
  async getStudent(req, res, next) {
    try {
      const student = await getDoc('students', req.params.id);
      return ok(res, student);
    } catch (error) {
      return next(error);
    }
  },
  async updateStudent(req, res, next) {
    try {
      const updated = await updateDoc('students', req.params.id, req.body || {});
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async listVerifiedStudents(req, res, next) {
    try {
      const students = await listDocs('students', { field: 'verificationStatus', value: 'verified' });
      return ok(res, students);
    } catch (error) {
      return next(error);
    }
  },
  async listPendingStudents(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let students = await listDocs('students', { field: 'verificationStatus', value: 'pending' });
      if (collegeId) {
        students = students.filter((s) => s.collegeId === collegeId);
      }
      return ok(res, students);
    } catch (error) {
      return next(error);
    }
  },
  async approveStudent(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await updateDoc('students', id, { verificationStatus: 'verified' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async rejectStudent(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await updateDoc('students', id, { verificationStatus: 'rejected' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  // Wallet / SBTs
  async listWallet(req, res, next) {
    try {
      const studentId = req.params.studentId;
      const sbts = await listDocs('sbts', { field: 'studentId', value: studentId });
      return ok(res, sbts);
    } catch (error) {
      return next(error);
    }
  },
  async issueSbt(req, res, next) {
    try {
      const studentId = req.params.studentId;
      const doc = await createDoc('sbts', { studentId, ...(req.body || {}) });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },

  // Leaderboards
  async listCollegeLeaderboard(req, res, next) {
    try {
      const colleges = await listDocs('colleges');
      const students = await listDocs('students');
      const ranked = colleges.map((c) => {
        const cs = students.filter((s) => s.collegeId === c.id && s.verificationStatus === 'verified');
        const total = cs.reduce((a, s) => a + (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0), 0);
        return { ...c, totalPoints: total, verifiedStudents: cs.length };
      }).sort((a, b) => b.totalPoints - a.totalPoints);
      return ok(res, ranked);
    } catch (error) {
      return next(error);
    }
  },
  async listStudentLeaderboard(req, res, next) {
    try {
      const { category, collegeId } = req.query || {};
      let students = await listDocs('students');
      students = students.filter((s) => s.verificationStatus === 'verified');
      if (collegeId) students = students.filter((s) => s.collegeId === collegeId);
      const colleges = await listDocs('colleges');
      const ranked = students.map((s) => {
        const pts = category === 'cultural'
          ? (s.points?.cultural || 0)
          : category === 'sports'
            ? (s.points?.sports || 0)
            : category === 'education'
              ? (s.points?.education || 0)
              : (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0);
        const college = colleges.find((c) => c.id === s.collegeId);
        return { ...s, totalPoints: pts, collegeName: college?.name || '' };
      }).sort((a, b) => b.totalPoints - a.totalPoints);
      return ok(res, ranked);
    } catch (error) {
      return next(error);
    }
  },

  // Gigs
  async listGigs(req, res, next) {
    try {
      const gigs = await listDocs('gigs');
      return ok(res, gigs);
    } catch (error) {
      return next(error);
    }
  },
  async createGig(req, res, next) {
    try {
      const doc = await createDoc('gigs', { status: 'open', ...(req.body || {}) });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async listGigApplications(req, res, next) {
    try {
      const { gigId } = req.params;
      const apps = await listDocs('gigApplications', { field: 'gigId', value: gigId });
      return ok(res, apps);
    } catch (error) {
      return next(error);
    }
  },
  async listAllGigApplications(req, res, next) {
    try {
      const apps = await listDocs('gigApplications');
      return ok(res, apps);
    } catch (error) {
      return next(error);
    }
  },
  async applyToGig(req, res, next) {
    try {
      const { gigId } = req.params;
      const { studentId } = req.body || {};
      const doc = await createDoc('gigApplications', { gigId, studentId, status: 'applied' });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async withdrawGig(req, res, next) {
    try {
      const { appId } = req.params;
      await deleteDoc('gigApplications', appId);
      return ok(res, { id: appId, deleted: true });
    } catch (error) {
      return next(error);
    }
  },
  async updateGigApplication(req, res, next) {
    try {
      const { appId } = req.params;
      const { status } = req.body || {};
      const updated = await updateDoc('gigApplications', appId, { status });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async completeGig(req, res, next) {
    try {
      const { appId } = req.params;
      const { studentId, gigTitle } = req.body || {};
      const updated = await updateDoc('gigApplications', appId, { status: 'completed' });
      await createDoc('sbts', {
        studentId,
        title: 'MicroGig Completed',
        reason: `Completed microgig: ${gigTitle || 'MicroGig'}`,
        issuedBy: 'CollegeVerse',
        date: new Date().toISOString().split('T')[0],
        txHash: '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6),
      });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  // Marketplace
  async listMarketplace(req, res, next) {
    try {
      const items = await listDocs('marketplace');
      return ok(res, items);
    } catch (error) {
      return next(error);
    }
  },
  async createMarketplaceItem(req, res, next) {
    try {
      const payload = req.body || {};
      const doc = await createDoc('marketplace', {
        status: 'available',
        flagged: false,
        createdAt: new Date().toISOString().split('T')[0],
        ...payload,
      });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async reserveItem(req, res, next) {
    try {
      const updated = await updateDoc('marketplace', req.params.itemId, { status: 'reserved' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async flagItem(req, res, next) {
    try {
      const { reason } = req.body || {};
      const updated = await updateDoc('marketplace', req.params.itemId, { flagged: true, flagReason: reason || 'Reported by user' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async updateMarketplaceItem(req, res, next) {
    try {
      const updated = await updateDoc('marketplace', req.params.itemId, req.body || {});
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async deleteMarketplaceItem(req, res, next) {
    try {
      await deleteDoc('marketplace', req.params.itemId);
      return ok(res, { id: req.params.itemId, deleted: true });
    } catch (error) {
      return next(error);
    }
  },

  // Communities
  async listCommunities(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let communities = await listDocs('communities');
      if (collegeId) communities = communities.filter((c) => c.collegeId === collegeId);
      return ok(res, communities);
    } catch (error) {
      return next(error);
    }
  },
  async joinCommunity(req, res, next) {
    try {
      const { communityId } = req.params;
      const { studentId } = req.body || {};
      const community = await getDoc('communities', communityId);
      if (!community) return ok(res, null);
      const members = Array.isArray(community.members) ? community.members : [];
      const nextMembers = members.includes(studentId) ? members : [...members, studentId];
      const updated = await updateDoc('communities', communityId, { members: nextMembers });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async leaveCommunity(req, res, next) {
    try {
      const { communityId } = req.params;
      const { studentId } = req.body || {};
      const community = await getDoc('communities', communityId);
      if (!community) return ok(res, null);
      const members = Array.isArray(community.members) ? community.members : [];
      const nextMembers = members.filter((m) => m !== studentId);
      await updateDoc('communities', communityId, { members: nextMembers });
      return ok(res, { id: communityId, left: true });
    } catch (error) {
      return next(error);
    }
  },

  // Clubs
  async listClubs(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let clubs = await listDocs('clubs');
      if (collegeId) clubs = clubs.filter((c) => c.collegeId === collegeId);
      return ok(res, clubs);
    } catch (error) {
      return next(error);
    }
  },
  async createClub(req, res, next) {
    try {
      const payload = req.body || {};
      const doc = await createDoc('clubs', { status: 'pending', members: [], ...payload });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async approveClub(req, res, next) {
    try {
      const updated = await updateDoc('clubs', req.params.clubId, { status: 'approved' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async rejectClub(req, res, next) {
    try {
      const updated = await updateDoc('clubs', req.params.clubId, { status: 'rejected' });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async joinClub(req, res, next) {
    try {
      const { clubId } = req.params;
      const { studentId } = req.body || {};
      const club = await getDoc('clubs', clubId);
      if (!club) return ok(res, null);
      const members = Array.isArray(club.members) ? club.members : [];
      const nextMembers = members.includes(studentId) ? members : [...members, studentId];
      const updated = await updateDoc('clubs', clubId, { members: nextMembers });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  // Events
  async listEvents(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let events = await listDocs('events');
      if (collegeId) events = events.filter((e) => e.collegeId === collegeId);
      return ok(res, events);
    } catch (error) {
      return next(error);
    }
  },
  async createEvent(req, res, next) {
    try {
      const payload = req.body || {};
      const doc = await createDoc('events', { applicants: [], ...payload });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async applyToEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { studentId } = req.body || {};
      const event = await getDoc('events', eventId);
      if (!event) return ok(res, null);
      const applicants = Array.isArray(event.applicants) ? event.applicants : [];
      const nextApplicants = applicants.includes(studentId) ? applicants : [...applicants, studentId];
      await updateDoc('events', eventId, { applicants: nextApplicants });
      return ok(res, { eventId, applied: true });
    } catch (error) {
      return next(error);
    }
  },
  async deleteEvent(req, res, next) {
    try {
      await deleteDoc('events', req.params.eventId);
      return ok(res, { id: req.params.eventId, deleted: true });
    } catch (error) {
      return next(error);
    }
  },

  // Teams
  async listTeams(req, res, next) {
    try {
      const { eventId } = req.params;
      const teams = await listDocs('teams', { field: 'eventId', value: eventId });
      return ok(res, teams);
    } catch (error) {
      return next(error);
    }
  },
  async createTeam(req, res, next) {
    try {
      const payload = req.body || {};
      const doc = await createDoc('teams', payload);
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async joinTeam(req, res, next) {
    try {
      const { teamId } = req.params;
      const { studentId } = req.body || {};
      const team = await getDoc('teams', teamId);
      if (!team) return ok(res, null);
      const members = Array.isArray(team.members) ? team.members : [];
      if (!members.includes(studentId) && (team.openSlots || 0) > 0) {
        members.push(studentId);
      }
      const openSlots = Math.max((team.openSlots || 0) - 1, 0);
      const updated = await updateDoc('teams', teamId, { members, openSlots });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  // Placements
  async listPlacements(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let placements = await listDocs('placements');
      if (collegeId) placements = placements.filter((p) => p.collegeId === collegeId);
      return ok(res, placements);
    } catch (error) {
      return next(error);
    }
  },
  async applyToPlacement(req, res, next) {
    try {
      const { placementId } = req.params;
      const { studentId } = req.body || {};
      const placement = await getDoc('placements', placementId);
      if (!placement) return ok(res, null);
      const applicants = Array.isArray(placement.applicants) ? placement.applicants : [];
      const nextApplicants = applicants.includes(studentId) ? applicants : [...applicants, studentId];
      await updateDoc('placements', placementId, { applicants: nextApplicants });
      return ok(res, { placementId, applied: true });
    } catch (error) {
      return next(error);
    }
  },

  // Notices
  async listNotices(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      let notices = await listDocs('notices');
      if (collegeId) notices = notices.filter((n) => n.collegeId === collegeId);
      return ok(res, notices);
    } catch (error) {
      return next(error);
    }
  },
  async createNotice(req, res, next) {
    try {
      const doc = await createDoc('notices', req.body || {});
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async updateNotice(req, res, next) {
    try {
      const updated = await updateDoc('notices', req.params.noticeId, req.body || {});
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },
  async deleteNotice(req, res, next) {
    try {
      await deleteDoc('notices', req.params.noticeId);
      return ok(res, { id: req.params.noticeId, deleted: true });
    } catch (error) {
      return next(error);
    }
  },

  // Messages
  async listMessages(req, res, next) {
    try {
      const { communityId } = req.query || {};
      const messages = await listDocs('messages', communityId ? { field: 'communityId', value: communityId } : null);
      return ok(res, messages);
    } catch (error) {
      return next(error);
    }
  },
  async sendMessage(req, res, next) {
    try {
      const payload = req.body || {};
      const doc = await createDoc('messages', { timestamp: new Date().toISOString(), ...payload });
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async deleteMessage(req, res, next) {
    try {
      await deleteDoc('messages', req.params.messageId);
      return ok(res, { id: req.params.messageId, deleted: true });
    } catch (error) {
      return next(error);
    }
  },

  // Competitions
  async listCompetitions(req, res, next) {
    try {
      const comps = await listDocs('competitions');
      return ok(res, comps);
    } catch (error) {
      return next(error);
    }
  },
  async joinCompetition(req, res, next) {
    try {
      const { competitionId } = req.params;
      const { studentId } = req.body || {};
      const comp = await getDoc('competitions', competitionId);
      if (!comp) return ok(res, null);
      const participants = Array.isArray(comp.participants) ? comp.participants : [];
      const nextParticipants = participants.includes(studentId) ? participants : [...participants, studentId];
      await updateDoc('competitions', competitionId, { participants: nextParticipants });
      return ok(res, { competitionId, joined: true });
    } catch (error) {
      return next(error);
    }
  },

  // Shortlist
  async listShortlist(req, res, next) {
    try {
      const { recruiterId } = req.query || {};
      let list = await listDocs('shortlist');
      if (recruiterId) list = list.filter((s) => s.recruiterId === recruiterId);
      return ok(res, list);
    } catch (error) {
      return next(error);
    }
  },
  async addToShortlist(req, res, next) {
    try {
      const doc = await createDoc('shortlist', req.body || {});
      return ok(res, doc);
    } catch (error) {
      return next(error);
    }
  },
  async removeFromShortlist(req, res, next) {
    try {
      const { recruiterId, studentId } = req.query || {};
      const items = await listDocs('shortlist');
      const toDelete = items.filter((s) => s.recruiterId === recruiterId && s.studentId === studentId);
      await Promise.all(toDelete.map((entry) => deleteDoc('shortlist', entry.id)));
      return ok(res, { removed: toDelete.length });
    } catch (error) {
      return next(error);
    }
  },
  async updateShortlist(req, res, next) {
    try {
      const { recruiterId, studentId, notes } = req.body || {};
      const items = await listDocs('shortlist');
      const match = items.find((s) => s.recruiterId === recruiterId && s.studentId === studentId);
      if (!match) return ok(res, null);
      const updated = await updateDoc('shortlist', match.id, { notes });
      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  // Faculty
  async getFaculty(req, res, next) {
    try {
      const faculty = await getDoc('faculty', req.params.id);
      return ok(res, faculty);
    } catch (error) {
      return next(error);
    }
  },

  // Analytics
  async getCollegeAnalytics(req, res, next) {
    try {
      const { collegeId } = req.query || {};
      const students = await listDocs('students');
      const events = await listDocs('events');
      const gigApps = await listDocs('gigApplications');
      const market = await listDocs('marketplace');
      const collegeStudents = collegeId ? students.filter((s) => s.collegeId === collegeId) : students;
      const verified = collegeStudents.filter((s) => s.verificationStatus === 'verified').length;
      const collegeEvents = collegeId ? events.filter((e) => e.collegeId === collegeId) : events;
      const totalApplicants = collegeEvents.reduce((a, e) => a + (e.applicants || []).length, 0);
      const completedGigs = gigApps.filter((a) => a.status === 'completed').length;
      const marketItems = collegeId ? market.filter((m) => m.collegeId === collegeId) : market;
      const stats = {
        totalStudents: collegeStudents.length,
        verified,
        pending: collegeStudents.length - verified,
        totalEvents: collegeEvents.length,
        totalApplicants,
        completedGigs,
        activeGigs: gigApps.filter((a) => a.status === 'applied').length,
        marketplaceVolume: marketItems.reduce((a, m) => a + (m.price || 0), 0),
        marketplaceItems: marketItems.length,
      };
      return ok(res, stats);
    } catch (error) {
      return next(error);
    }
  },

  // Contact
  async submitContact(req, res, next) {
    try {
      const doc = await createDoc('contactInquiries', { ...(req.body || {}), createdAt: new Date().toISOString() });
      return ok(res, { success: true, id: doc.id });
    } catch (error) {
      return next(error);
    }
  },

  async getProfileByEmail(req, res, next) {
    try {
      const { email, role } = req.query || {};
      if (!email || !role) {
        return ok(res, null);
      }
      const collection = role === 'faculty' ? 'faculty' : role === 'recruiter' ? 'recruiters' : 'students';
      const snapshot = await db.collection(collection).where('email', '==', email).limit(1).get();
      if (snapshot.empty) return ok(res, null);
      const doc = snapshot.docs[0];
      return ok(res, { id: doc.id, ...doc.data() });
    } catch (error) {
      return next(error);
    }
  },

  async signup(req, res, next) {
    try {
      const { role, email, name, collegeId, department, company, position, password } = req.body || {};
      if (!role || !email || !name) {
        return ok(res, null);
      }

      if (role === 'student') {
        // Check college domain
        const colleges = await listDocs('colleges');
        const college = colleges.find((c) => email.endsWith(`@${c.domain}`));
        const resolvedCollegeId = college ? college.id : (collegeId || null);

        const existing = await db.collection('students').where('email', '==', email).limit(1).get();
        if (!existing.empty) {
          return ok(res, { id: existing.docs[0].id, ...existing.docs[0].data() });
        }

        const doc = await createDoc('students', {
          name,
          email,
          password: password || '',
          collegeId: resolvedCollegeId,
          verificationStatus: 'pending',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          skills: [],
          points: { cultural: 0, sports: 0, education: 0, coding: 0 },
          achievements: [],
          certificates: [],
          bio: '',
        });
        return ok(res, doc);
      }

      if (role === 'faculty') {
        const existing = await db.collection('faculty').where('email', '==', email).limit(1).get();
        if (!existing.empty) {
          return ok(res, { id: existing.docs[0].id, ...existing.docs[0].data() });
        }
        // Also create roleOverride so auth bootstrap assigns correct role
        const overrideId = email.replace(/[^a-z0-9]/gi, '_');
        await db.collection('roleOverrides').doc(overrideId).set({
          email,
          role: 'faculty',
          subRole: 'faculty',
          collegeId: collegeId || null,
          verificationStatus: 'verified',
        }, { merge: true });

        const doc = await createDoc('faculty', {
          name,
          email,
          password: password || '',
          collegeId: collegeId || null,
          role: 'normal',
          department: department || '',
        });
        return ok(res, doc);
      }

      if (role === 'recruiter') {
        const existing = await db.collection('recruiters').where('email', '==', email).limit(1).get();
        if (!existing.empty) {
          return ok(res, { id: existing.docs[0].id, ...existing.docs[0].data() });
        }
        // Also create roleOverride
        const overrideId = email.replace(/[^a-z0-9]/gi, '_');
        await db.collection('roleOverrides').doc(overrideId).set({
          email,
          role: 'recruiter',
          subRole: null,
          collegeId: null,
          verificationStatus: 'verified',
        }, { merge: true });

        const doc = await createDoc('recruiters', {
          name,
          email,
          password: password || '',
          company: company || '',
          position: position || '',
        });
        return ok(res, doc);
      }

      return ok(res, null);
    } catch (error) {
      return next(error);
    }
  },
};
