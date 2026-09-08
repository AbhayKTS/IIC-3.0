const express = require('express');
const compat = require('../../controllers/compat.controller');

const router = express.Router();

// Colleges
router.get('/colleges', compat.listColleges);
router.get('/colleges/:id', compat.getCollege);

// Students
router.get('/students', compat.listStudents);
router.get('/students/verified', compat.listVerifiedStudents);
router.get('/students/pending', compat.listPendingStudents);
router.get('/students/:id', compat.getStudent);
router.put('/students/:id', compat.updateStudent);
router.post('/students/:id/approve', compat.approveStudent);
router.post('/students/:id/reject', compat.rejectStudent);

// Wallet
router.get('/wallet/:studentId', compat.listWallet);
router.post('/wallet/:studentId', compat.issueSbt);

// Leaderboards
router.get('/leaderboard/colleges', compat.listCollegeLeaderboard);
router.get('/leaderboard/students', compat.listStudentLeaderboard);

// Gigs
router.get('/gigs', compat.listGigs);
router.post('/gigs', compat.createGig);
router.get('/gigs/:gigId/applications', compat.listGigApplications);
router.get('/gig-applications', compat.listAllGigApplications);
router.post('/gigs/:gigId/apply', compat.applyToGig);
router.delete('/gig-applications/:appId', compat.withdrawGig);
router.patch('/gig-applications/:appId', compat.updateGigApplication);
router.post('/gig-applications/:appId/complete', compat.completeGig);

// Marketplace
router.get('/marketplace', compat.listMarketplace);
router.post('/marketplace', compat.createMarketplaceItem);
router.post('/marketplace/:itemId/reserve', compat.reserveItem);
router.post('/marketplace/:itemId/flag', compat.flagItem);
router.patch('/marketplace/:itemId', compat.updateMarketplaceItem);
router.delete('/marketplace/:itemId', compat.deleteMarketplaceItem);

// Communities
router.get('/communities', compat.listCommunities);
router.post('/communities/:communityId/join', compat.joinCommunity);
router.post('/communities/:communityId/leave', compat.leaveCommunity);

// Clubs
router.get('/clubs', compat.listClubs);
router.post('/clubs', compat.createClub);
router.post('/clubs/:clubId/approve', compat.approveClub);
router.post('/clubs/:clubId/reject', compat.rejectClub);
router.post('/clubs/:clubId/join', compat.joinClub);

// Events
router.get('/events', compat.listEvents);
router.post('/events', compat.createEvent);
router.post('/events/:eventId/apply', compat.applyToEvent);
router.delete('/events/:eventId', compat.deleteEvent);

// Teams
router.get('/events/:eventId/teams', compat.listTeams);
router.post('/teams', compat.createTeam);
router.post('/teams/:teamId/join', compat.joinTeam);

// Placements
router.get('/placements', compat.listPlacements);
router.post('/placements/:placementId/apply', compat.applyToPlacement);

// Notices
router.get('/notices', compat.listNotices);
router.post('/notices', compat.createNotice);
router.patch('/notices/:noticeId', compat.updateNotice);
router.delete('/notices/:noticeId', compat.deleteNotice);

// Messages
router.get('/messages', compat.listMessages);
router.post('/messages', compat.sendMessage);
router.delete('/messages/:messageId', compat.deleteMessage);

// Competitions
router.get('/competitions', compat.listCompetitions);
router.post('/competitions/:competitionId/join', compat.joinCompetition);

// Shortlist
router.get('/shortlist', compat.listShortlist);
router.post('/shortlist', compat.addToShortlist);
router.delete('/shortlist', compat.removeFromShortlist);
router.patch('/shortlist', compat.updateShortlist);

// Faculty
router.get('/faculty/:id', compat.getFaculty);

// Analytics
router.get('/analytics', compat.getCollegeAnalytics);

// Contact
router.post('/contact', compat.submitContact);

// Profile lookup
router.get('/profile', compat.getProfileByEmail);

// Signup (create student/faculty/recruiter profile in Firestore)
router.post('/signup', compat.signup);

module.exports = router;
