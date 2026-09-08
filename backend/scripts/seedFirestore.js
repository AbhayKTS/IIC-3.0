const admin = require('../src/services/firebaseAdmin');

const db = admin.firestore();

const seedColleges = [
  { id: 'c1', name: 'IIT Delhi', location: 'New Delhi', ranking: 1, type: 'IIT', studentCount: 8500, departments: ['CSE', 'ECE', 'Mechanical', 'Civil', 'Chemical'], description: 'Premier engineering institute known for cutting-edge research and innovation.', established: 1961, domain: 'iitd.ac.in', isActive: true },
  { id: 'c2', name: 'IIT Bombay', location: 'Mumbai', ranking: 2, type: 'IIT', studentCount: 10000, departments: ['CSE', 'EE', 'Mechanical', 'Aerospace', 'Chemistry'], description: 'Leading technical institute with world-class facilities and global recognition.', established: 1958, domain: 'iitb.ac.in', isActive: true },
  { id: 'c3', name: 'NIT Trichy', location: 'Tiruchirappalli', ranking: 8, type: 'NIT', studentCount: 6000, departments: ['CSE', 'ECE', 'Civil', 'Mechanical', 'Instrumentation'], description: 'Top NIT with strong placement record and vibrant campus life.', established: 1964, domain: 'nitt.ac.in', isActive: true },
  { id: 'c4', name: 'BITS Pilani', location: 'Pilani', ranking: 5, type: 'Private', studentCount: 4500, departments: ['CSE', 'ECE', 'EEE', 'Pharmacy', 'Economics'], description: 'Premier private university known for flexible academics and strong industry ties.', established: 1964, domain: 'bits.ac.in', isActive: true },
  { id: 'c5', name: 'DTU', location: 'New Delhi', ranking: 12, type: 'State', studentCount: 7000, departments: ['CSE', 'IT', 'ECE', 'Mechanical', 'Civil'], description: 'Delhi Technological University - a top state engineering college.', established: 1941, domain: 'dtu.ac.in', isActive: true },
];

const seedStudents = [
  { id: 's1', name: 'Arjun Patel', email: 'arjun@iitd.ac.in', password: 'pass123', collegeId: 'c1', verificationStatus: 'verified', avatar: '', skills: ['React', 'Python', 'ML'], points: { cultural: 85, sports: 60, education: 92, coding: 88 }, github: 'arjunpatel', linkedin: 'arjunpatel', leetcode: 'arjunp', achievements: [{ title: 'Hackathon Winner', date: '2025-03-15', points: 50 }, { title: 'Research Paper Published', date: '2025-06-01', points: 80 }], certificates: [{ title: 'AWS Solutions Architect', issuer: 'AWS', date: '2025-01-10' }], bio: 'CS undergrad passionate about AI and distributed systems.' },
  { id: 's2', name: 'Priya Sharma', email: 'priya@iitd.ac.in', password: 'pass123', collegeId: 'c1', verificationStatus: 'pending', avatar: '', skills: ['Java', 'Spring', 'SQL'], points: { cultural: 70, sports: 45, education: 88, coding: 75 }, achievements: [], certificates: [], bio: 'Aspiring software engineer.' },
  { id: 's3', name: 'Rahul Kumar', email: 'rahul@iitb.ac.in', password: 'pass123', collegeId: 'c2', verificationStatus: 'verified', avatar: '', skills: ['C++', 'Algorithms', 'System Design'], points: { cultural: 40, sports: 90, education: 95, coding: 96 }, github: 'rahulk', leetcode: 'rahulk99', achievements: [{ title: 'ICPC Regionalist', date: '2025-02-20', points: 100 }], certificates: [{ title: 'Google Cloud Professional', issuer: 'Google', date: '2025-04-15' }], bio: 'Competitive programmer and systems enthusiast.' },
  { id: 's4', name: 'Sneha Reddy', email: 'sneha@nitt.ac.in', password: 'pass123', collegeId: 'c3', verificationStatus: 'pending', avatar: '', skills: ['UI/UX', 'Figma', 'React'], points: { cultural: 95, sports: 30, education: 78, coding: 65 }, achievements: [{ title: 'Best Design Award', date: '2025-05-10', points: 40 }], certificates: [], bio: 'Designer who codes.' },
  { id: 's5', name: 'Amit Singh', email: 'amit@bits.ac.in', password: 'pass123', collegeId: 'c4', verificationStatus: 'rejected', avatar: '', skills: ['Blockchain', 'Solidity', 'Web3'], points: { cultural: 55, sports: 70, education: 82, coding: 78 }, achievements: [], certificates: [], bio: 'Web3 enthusiast.' },
];

const seedFaculty = [
  { id: 'f1', name: 'Dr. Rajesh Gupta', email: 'rajesh@iitd.ac.in', password: 'pass123', collegeId: 'c1', role: 'admin', department: 'CSE' },
  { id: 'f2', name: 'Prof. Meera Iyer', email: 'meera@iitb.ac.in', password: 'pass123', collegeId: 'c2', role: 'normal', department: 'ECE' },
  { id: 'f3', name: 'Dr. Suresh Nair', email: 'suresh@nitt.ac.in', password: 'pass123', collegeId: 'c3', role: 'admin', department: 'CSE' },
];

const seedRecruiters = [
  { id: 'r1', name: 'Vikram Mehta', email: 'vikram@techcorp.com', password: 'pass123', company: 'TechCorp', position: 'Engineering Manager' },
  { id: 'r2', name: 'Ananya Das', email: 'ananya@innolabs.com', password: 'pass123', company: 'InnovateLabs', position: 'Talent Acquisition Lead' },
];

const seedGigs = [
  { id: 'g1', title: 'Build a React Dashboard', description: 'Create a responsive analytics dashboard with charts and data visualization.', skills: ['React', 'TailwindCSS', 'Chart.js'], reward: 5000, deadline: '2026-03-15', mode: 'remote', category: 'Development', duration: '2 weeks', paid: true, recruiterId: 'r1', status: 'open' },
  { id: 'g2', title: 'ML Model for Sentiment Analysis', description: 'Train and deploy a sentiment analysis model for product reviews.', skills: ['Python', 'ML', 'NLP'], reward: 8000, deadline: '2026-04-01', mode: 'remote', category: 'Data Science', duration: '3 weeks', paid: true, recruiterId: 'r1', status: 'open' },
  { id: 'g3', title: 'Campus Event Photography', description: 'Photograph the annual tech fest events over 3 days.', skills: ['Photography', 'Editing'], reward: 3000, deadline: '2026-03-20', mode: 'on-campus', category: 'Creative', duration: '3 days', paid: true, recruiterId: 'r2', status: 'open' },
];

const seedMarketplace = [
  { id: 'm1', title: 'Engineering Mathematics Textbook', category: 'Books', price: 350, condition: 'Good', description: 'Kreyszig Advanced Engineering Mathematics, 10th edition. Minor highlighting.', location: 'IIT Delhi Campus', sellerId: 's1', collegeId: 'c1', status: 'available', flagged: false, createdAt: '2026-01-15' },
  { id: 'm2', title: 'TI-84 Scientific Calculator', category: 'Electronics', price: 2500, condition: 'Like New', description: 'Barely used TI-84 Plus CE. Comes with original case and USB cable.', location: 'IIT Delhi Hostel', sellerId: 's1', collegeId: 'c1', status: 'available', flagged: false, createdAt: '2026-01-20' },
  { id: 'm3', title: 'Coding Bootcamp Notes Bundle', category: 'Notes', price: 150, condition: 'New', description: 'Comprehensive DSA + System Design handwritten notes. 200+ pages.', location: 'IIT Bombay', sellerId: 's3', collegeId: 'c2', status: 'available', flagged: false, createdAt: '2026-02-01' },
];

const seedCommunities = [
  { id: 'com1', name: 'IIT Delhi - Official', collegeId: 'c1', type: 'mandatory', members: ['s1', 's2'], description: 'Official community for all IIT Delhi students.' },
  { id: 'com2', name: 'Coding Club IITD', collegeId: 'c1', type: 'optional', members: ['s1'], description: 'For coding enthusiasts at IIT Delhi.' },
  { id: 'com3', name: 'IIT Bombay - Official', collegeId: 'c2', type: 'mandatory', members: ['s3'], description: 'Official community for all IIT Bombay students.' },
];

const seedClubs = [
  { id: 'cl1', name: 'AI Research Club', collegeId: 'c1', category: 'Technical', purpose: 'Explore AI/ML research and build projects together.', sponsor: 'Dr. Rajesh Gupta', status: 'approved', members: ['s1'], createdBy: 's1' },
  { id: 'cl2', name: 'Music Society', collegeId: 'c1', category: 'Cultural', purpose: 'Unite musicians on campus for jams and performances.', sponsor: 'Prof. Anita Roy', status: 'pending', members: [], createdBy: 's2' },
];

const seedEvents = [
  { id: 'e1', title: 'TechFest 2026', collegeId: 'c1', type: 'Technical', date: '2026-03-15', description: 'Annual technical festival with hackathons, workshops, and talks.', tags: ['hackathon', 'workshop', 'tech'], applicants: ['s1'] },
  { id: 'e2', title: 'Cultural Night', collegeId: 'c1', type: 'Cultural', date: '2026-04-10', description: 'An evening of music, dance, and drama performances.', tags: ['music', 'dance', 'cultural'], applicants: [] },
];

const seedTeams = [
  { id: 't1', eventId: 'e1', name: 'Team Alpha', members: ['s1'], openSlots: 2, createdBy: 's1' },
];

const seedPlacements = [
  { id: 'p1', title: 'Software Engineer', company: 'Google', collegeId: 'c1', deadline: '2026-03-20', description: 'Full-time SWE role for 2026 batch.', requirements: ['DSA', 'System Design', 'CS Fundamentals'], applicants: ['s1'], package: '45 LPA' },
  { id: 'p2', title: 'Product Manager', company: 'Microsoft', collegeId: 'c1', deadline: '2026-04-15', description: 'APM role for graduating students.', requirements: ['Product Sense', 'Analytics', 'Communication'], applicants: [], package: '38 LPA' },
];

const seedNotices = [
  { id: 'n1', title: 'Placement Drive Schedule Released', content: 'The placement drive for 2026 batch begins March 1st. Check the placements portal for details.', collegeId: 'c1', createdBy: 'f1', date: '2026-02-01', priority: 'high' },
  { id: 'n2', title: 'Library Hours Extended', content: 'Library will remain open until midnight during exam season (Feb 20 - Mar 10).', collegeId: 'c1', createdBy: 'f1', date: '2026-02-10', priority: 'medium' },
];

const seedMessages = [
  { id: 'msg1', communityId: 'com1', senderId: 's1', senderName: 'Arjun Patel', text: 'Hey everyone! Excited for TechFest?', timestamp: '2026-02-10T10:30:00Z' },
  { id: 'msg2', communityId: 'com1', senderId: 's2', senderName: 'Priya Sharma', text: 'Yes! Anyone forming teams?', timestamp: '2026-02-10T10:32:00Z' },
];

const seedCompetitions = [
  { id: 'comp1', title: 'Inter-IIT Tech Meet', type: 'all-college', date: '2026-04-15', description: 'Annual inter-IIT technical competition with multiple problem statements.', participants: ['s1', 's3'], status: 'upcoming', category: 'Technical' },
  { id: 'comp2', title: 'Delhi Area Coding Championship', type: 'area', date: '2026-03-25', description: 'Coding competition for all Delhi-NCR colleges.', participants: [], status: 'upcoming', category: 'Coding' },
];

const seedRoleOverrides = [
  {
    email: 'rajesh@iitd.ac.in',
    role: 'faculty',
    subRole: 'admin',
    collegeId: 'c1',
    verificationStatus: 'verified',
    profile: { id: 'f1', name: 'Dr. Rajesh Gupta', department: 'CSE', role: 'admin', collegeId: 'c1' },
  },
  {
    email: 'meera@iitb.ac.in',
    role: 'faculty',
    subRole: 'normal',
    collegeId: 'c2',
    verificationStatus: 'verified',
    profile: { id: 'f2', name: 'Prof. Meera Iyer', department: 'ECE', role: 'normal', collegeId: 'c2' },
  },
  {
    email: 'vikram@techcorp.com',
    role: 'recruiter',
    subRole: null,
    collegeId: null,
    verificationStatus: 'verified',
    profile: { id: 'r1', name: 'Vikram Mehta', company: 'TechCorp', position: 'Engineering Manager' },
  },
];

const seedShortlist = [
  { recruiterId: 'r1', studentId: 's1', notes: 'Strong React profile', addedAt: '2026-02-05' },
];

const seedSbts = [
  { id: 'sbt1', studentId: 's1', title: 'Verified Student Identity', reason: 'Identity verified by IIT Delhi administration', issuedBy: 'IIT Delhi', date: '2025-08-15', txHash: '0x7a3b...e4f1' },
];

const upsertCollection = async (collection, rows) => {
  const batch = db.batch();
  rows.forEach((row) => {
    const ref = row.id ? db.collection(collection).doc(row.id) : db.collection(collection).doc();
    batch.set(ref, row, { merge: true });
  });
  await batch.commit();
};

const upsertRoleOverrides = async () => {
  const batch = db.batch();
  seedRoleOverrides.forEach((row) => {
    const ref = db.collection('roleOverrides').doc(row.email);
    batch.set(ref, row, { merge: true });
  });
  await batch.commit();
};

const run = async () => {
  console.log('Seeding Firestore...');
  await upsertCollection('colleges', seedColleges);
  await upsertCollection('students', seedStudents);
  await upsertCollection('faculty', seedFaculty);
  await upsertCollection('recruiters', seedRecruiters);
  await upsertCollection('gigs', seedGigs);
  await upsertCollection('marketplace', seedMarketplace);
  await upsertCollection('communities', seedCommunities);
  await upsertCollection('clubs', seedClubs);
  await upsertCollection('events', seedEvents);
  await upsertCollection('teams', seedTeams);
  await upsertCollection('placements', seedPlacements);
  await upsertCollection('notices', seedNotices);
  await upsertCollection('messages', seedMessages);
  await upsertCollection('competitions', seedCompetitions);
  await upsertCollection('shortlist', seedShortlist);
  await upsertCollection('sbts', seedSbts);
  await upsertRoleOverrides();
  console.log('Seed complete.');
};

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
