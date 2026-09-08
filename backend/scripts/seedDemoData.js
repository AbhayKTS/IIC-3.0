/**
 * Seeds ALL Firestore data collections for a fully working demo UI.
 *
 * Run:  NODE_ENV=development node scripts/seedDemoData.js
 *
 * Prerequisites:
 *   - colleges & roleOverrides already seeded (npm run seed:demo)
 *   - Firebase Auth users created (manually or via seed:demo)
 *
 * Collections seeded:
 *   students, faculty, recruiters,
 *   events, teams, gigs, gigApplications,
 *   marketplace, communities, clubs,
 *   placements, notices, competitions, sbts
 */

const db = require('../src/services/firestore');

const now = new Date();
const isoDate = (daysOffset = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

// ── Students ───────────────────────────────────────────────────
const STUDENTS = [
  {
    id: 'student_arjun',
    name: 'Arjun Sharma',
    email: 'arjun@iitd.ac.in',
    password: 'pass123',
    collegeId: 'iitd',
    verificationStatus: 'verified',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
    skills: ['React', 'Node.js', 'Python', 'Firebase'],
    points: { cultural: 120, sports: 80, education: 200, coding: 350 },
    github: 'https://github.com/arjun-sharma',
    linkedin: 'https://linkedin.com/in/arjun-sharma',
    leetcode: 'https://leetcode.com/arjun-sharma',
    achievements: [
      { title: 'Hackathon Winner – TechFest 2024', date: '2024-03-15', points: 100 },
      { title: 'Best Project Award – CS Department', date: '2024-01-20', points: 50 },
    ],
    certificates: [
      { title: 'AWS Cloud Practitioner', issuer: 'Amazon Web Services', date: '2024-02-10' },
      { title: 'Full Stack Open', issuer: 'University of Helsinki', date: '2023-12-05' },
    ],
    bio: 'Full-stack developer passionate about building scalable web applications.',
  },
  {
    id: 'student_priya',
    name: 'Priya Patel',
    email: 'priya@iitd.ac.in',
    password: 'pass123',
    collegeId: 'iitd',
    verificationStatus: 'pending',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    skills: ['UI/UX', 'Figma', 'React', 'Tailwind CSS'],
    points: { cultural: 200, sports: 40, education: 150, coding: 180 },
    github: 'https://github.com/priya-patel',
    linkedin: 'https://linkedin.com/in/priya-patel',
    achievements: [
      { title: 'Design Sprint Champion', date: '2024-02-28', points: 75 },
    ],
    certificates: [
      { title: 'Google UX Design Certificate', issuer: 'Google', date: '2024-01-15' },
    ],
    bio: 'UI/UX designer who loves creating intuitive digital experiences.',
  },
  {
    id: 'student_rahul',
    name: 'Rahul Verma',
    email: 'rahul@iitb.ac.in',
    password: 'pass123',
    collegeId: 'iitb',
    verificationStatus: 'verified',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'Data Science'],
    points: { cultural: 60, sports: 150, education: 300, coding: 280 },
    github: 'https://github.com/rahul-verma',
    linkedin: 'https://linkedin.com/in/rahul-verma',
    codeforces: 'https://codeforces.com/profile/rahul_v',
    achievements: [
      { title: 'Kaggle Competition – Top 5%', date: '2024-04-01', points: 120 },
      { title: 'Sports Day – 100m Gold', date: '2024-01-10', points: 80 },
    ],
    certificates: [
      { title: 'Deep Learning Specialization', issuer: 'Coursera / Andrew Ng', date: '2023-11-20' },
    ],
    bio: 'ML enthusiast and competitive programmer.',
  },
  {
    id: 'student_ananya',
    name: 'Ananya Gupta',
    email: 'ananya@nitt.ac.in',
    password: 'pass123',
    collegeId: 'nitt',
    verificationStatus: 'verified',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya',
    skills: ['Java', 'Spring Boot', 'Microservices', 'Docker'],
    points: { cultural: 180, sports: 90, education: 250, coding: 220 },
    linkedin: 'https://linkedin.com/in/ananya-gupta',
    codechef: 'https://www.codechef.com/users/ananya_g',
    achievements: [
      { title: 'Cultural Fest Coordinator', date: '2024-02-15', points: 60 },
      { title: 'Open Source Contributor – Apache', date: '2024-03-01', points: 90 },
    ],
    certificates: [
      { title: 'Java SE 17 Developer', issuer: 'Oracle', date: '2024-03-10' },
    ],
    bio: 'Backend engineer with a love for microservices architecture.',
  },
  {
    id: 'student_karthik',
    name: 'Karthik Reddy',
    email: 'karthik@bits.ac.in',
    password: 'pass123',
    collegeId: 'bits',
    verificationStatus: 'verified',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=karthik',
    skills: ['Blockchain', 'Solidity', 'Web3', 'Rust'],
    points: { cultural: 40, sports: 60, education: 180, coding: 400 },
    github: 'https://github.com/karthik-reddy',
    achievements: [
      { title: 'ETHIndia Hackathon – 2nd Place', date: '2024-01-05', points: 150 },
    ],
    certificates: [
      { title: 'Certified Blockchain Developer', issuer: 'Blockchain Council', date: '2023-10-15' },
    ],
    bio: 'Web3 builder and smart contract auditor.',
  },
  {
    id: 'student_sneha',
    name: 'Sneha Iyer',
    email: 'sneha@dtu.ac.in',
    password: 'pass123',
    collegeId: 'dtu',
    verificationStatus: 'verified',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha',
    skills: ['Flutter', 'Dart', 'Firebase', 'iOS', 'Android'],
    points: { cultural: 100, sports: 120, education: 160, coding: 250 },
    github: 'https://github.com/sneha-iyer',
    linkedin: 'https://linkedin.com/in/sneha-iyer',
    achievements: [
      { title: 'Google Solution Challenge Finalist', date: '2024-04-10', points: 100 },
      { title: 'Basketball Team Captain', date: '2024-01-01', points: 70 },
    ],
    certificates: [
      { title: 'Flutter & Dart – The Complete Guide', issuer: 'Udemy', date: '2023-09-20' },
    ],
    bio: 'Mobile developer building apps that matter.',
  },
];

// ── Faculty ────────────────────────────────────────────────────
const FACULTY = [
  {
    id: 'faculty_rajesh',
    name: 'Prof. Rajesh Kumar',
    email: 'rajesh@iitd.ac.in',
    password: 'pass123',
    collegeId: 'iitd',
    role: 'admin',
    department: 'Computer Science',
  },
  {
    id: 'faculty_meera',
    name: 'Dr. Meera Nair',
    email: 'meera@iitb.ac.in',
    password: 'pass123',
    collegeId: 'iitb',
    role: 'normal',
    department: 'Electrical Engineering',
  },
];

// ── Recruiters ─────────────────────────────────────────────────
const RECRUITERS = [
  {
    id: 'recruiter_vikram',
    name: 'Vikram Mehta',
    email: 'vikram@techcorp.com',
    password: 'pass123',
    company: 'TechCorp India',
    position: 'Senior Talent Acquisition Manager',
  },
  {
    id: 'recruiter_aisha',
    name: 'Aisha Khan',
    email: 'aisha@innovate.io',
    password: 'pass123',
    company: 'Innovate.io',
    position: 'HR Lead',
  },
];

// ── Events ─────────────────────────────────────────────────────
const EVENTS = [
  {
    id: 'event_techfest',
    title: 'TechFest 2025',
    collegeId: 'iitd',
    type: 'Technical',
    date: isoDate(15),
    description: 'Annual technology festival featuring hackathons, workshops, and guest lectures from industry leaders.',
    tags: ['hackathon', 'tech', 'coding', 'AI'],
    applicants: ['student_arjun', 'student_priya'],
  },
  {
    id: 'event_cultural_night',
    title: 'Cultural Night – Rendezvous',
    collegeId: 'iitd',
    type: 'Cultural',
    date: isoDate(30),
    description: 'An evening of music, dance, drama, and stand-up comedy performances by student artists.',
    tags: ['cultural', 'music', 'dance', 'drama'],
    applicants: ['student_priya'],
  },
  {
    id: 'event_sportsmeet',
    title: 'Inter-College Sports Meet',
    collegeId: 'iitb',
    type: 'Sports',
    date: isoDate(20),
    description: 'Three-day inter-college sports competition covering cricket, basketball, athletics, and swimming.',
    tags: ['sports', 'cricket', 'athletics', 'inter-college'],
    applicants: ['student_rahul', 'student_sneha'],
  },
  {
    id: 'event_ai_workshop',
    title: 'AI/ML Workshop Series',
    collegeId: 'nitt',
    type: 'Workshop',
    date: isoDate(7),
    description: 'Hands-on workshop covering practical ML with TensorFlow, PyTorch, and real-world datasets.',
    tags: ['AI', 'ML', 'workshop', 'python'],
    applicants: ['student_ananya', 'student_rahul'],
  },
  {
    id: 'event_startup_pitch',
    title: 'Startup Pitch Day',
    collegeId: 'bits',
    type: 'Entrepreneurship',
    date: isoDate(25),
    description: 'Present your startup idea to a panel of VCs and angel investors. Top 3 pitches win seed funding.',
    tags: ['startup', 'pitch', 'entrepreneurship', 'funding'],
    applicants: ['student_karthik'],
  },
  {
    id: 'event_hacknight',
    title: 'HackNight DTU',
    collegeId: 'dtu',
    type: 'Technical',
    date: isoDate(10),
    description: '24-hour overnight hackathon. Build something amazing from scratch. Prizes worth ₹2 Lakhs.',
    tags: ['hackathon', 'overnight', 'coding'],
    applicants: ['student_sneha', 'student_arjun'],
  },
];

// ── Teams ──────────────────────────────────────────────────────
const TEAMS = [
  {
    id: 'team_alpha',
    eventId: 'event_techfest',
    name: 'Team Alpha',
    members: ['student_arjun'],
    openSlots: 2,
    createdBy: 'student_arjun',
  },
  {
    id: 'team_phoenix',
    eventId: 'event_hacknight',
    name: 'Team Phoenix',
    members: ['student_sneha', 'student_arjun'],
    openSlots: 1,
    createdBy: 'student_sneha',
  },
  {
    id: 'team_ml_squad',
    eventId: 'event_ai_workshop',
    name: 'ML Squad',
    members: ['student_rahul', 'student_ananya'],
    openSlots: 2,
    createdBy: 'student_rahul',
  },
];

// ── Gigs ───────────────────────────────────────────────────────
const GIGS = [
  {
    id: 'gig_web_redesign',
    title: 'College Website Redesign',
    description: 'Redesign the CS department website with modern UI/UX. Must use React and be responsive.',
    skills: ['React', 'Tailwind CSS', 'UI/UX'],
    reward: 5000,
    deadline: isoDate(14),
    mode: 'on-campus',
    category: 'Web Development',
    duration: '2 weeks',
    paid: true,
    recruiterId: 'recruiter_vikram',
    status: 'open',
  },
  {
    id: 'gig_data_analysis',
    title: 'Student Survey Data Analysis',
    description: 'Analyze annual student satisfaction survey data and create visualizations for the dean\'s report.',
    skills: ['Python', 'Pandas', 'Data Visualization'],
    reward: 3000,
    deadline: isoDate(10),
    mode: 'remote',
    category: 'Data Science',
    duration: '1 week',
    paid: true,
    recruiterId: 'recruiter_vikram',
    status: 'open',
  },
  {
    id: 'gig_mobile_app',
    title: 'Event Attendance Tracker App',
    description: 'Build a Flutter app that lets organizers track event attendance via QR codes.',
    skills: ['Flutter', 'Dart', 'Firebase'],
    reward: 8000,
    deadline: isoDate(21),
    mode: 'remote',
    category: 'Mobile Development',
    duration: '3 weeks',
    paid: true,
    recruiterId: 'recruiter_aisha',
    status: 'open',
  },
  {
    id: 'gig_content_writing',
    title: 'Tech Blog Content Writer',
    description: 'Write 5 technical blog posts on trending topics like AI, Web3, and Cloud Computing.',
    skills: ['Technical Writing', 'AI', 'Cloud'],
    reward: 2500,
    deadline: isoDate(18),
    mode: 'remote',
    category: 'Content',
    duration: '2 weeks',
    paid: true,
    recruiterId: 'recruiter_aisha',
    status: 'open',
  },
  {
    id: 'gig_ml_model',
    title: 'Placement Prediction ML Model',
    description: 'Train a model to predict placement probability based on student profile attributes.',
    skills: ['Machine Learning', 'Python', 'scikit-learn'],
    reward: 6000,
    deadline: isoDate(28),
    mode: 'remote',
    category: 'Data Science',
    duration: '4 weeks',
    paid: true,
    recruiterId: 'recruiter_vikram',
    status: 'open',
  },
];

// ── Gig Applications ──────────────────────────────────────────
const GIG_APPLICATIONS = [
  { id: 'gapp_1', gigId: 'gig_web_redesign', studentId: 'student_arjun', status: 'applied' },
  { id: 'gapp_2', gigId: 'gig_web_redesign', studentId: 'student_priya', status: 'applied' },
  { id: 'gapp_3', gigId: 'gig_data_analysis', studentId: 'student_rahul', status: 'accepted' },
  { id: 'gapp_4', gigId: 'gig_mobile_app', studentId: 'student_sneha', status: 'applied' },
  { id: 'gapp_5', gigId: 'gig_ml_model', studentId: 'student_rahul', status: 'applied' },
];

// ── Marketplace ────────────────────────────────────────────────
const MARKETPLACE = [
  {
    id: 'mkt_textbook_dsa',
    title: 'Introduction to Algorithms (CLRS) – 4th Edition',
    category: 'Books',
    price: 450,
    condition: 'Like New',
    description: 'Used for one semester. Minor highlighting. ISBN: 978-0262046305.',
    location: 'IIT Delhi, Jwalamukhi Hostel',
    sellerId: 'student_arjun',
    collegeId: 'iitd',
    status: 'available',
    flagged: false,
    createdAt: isoDate(-5),
  },
  {
    id: 'mkt_calculator',
    title: 'Casio FX-991EX Scientific Calculator',
    category: 'Electronics',
    price: 800,
    condition: 'Good',
    description: 'Fully working. Battery recently replaced. Great for engineering exams.',
    location: 'IIT Delhi, Aravali Hostel',
    sellerId: 'student_priya',
    collegeId: 'iitd',
    status: 'available',
    flagged: false,
    createdAt: isoDate(-3),
  },
  {
    id: 'mkt_bicycle',
    title: 'Hero Sprint 26T Mountain Bike',
    category: 'Transport',
    price: 3500,
    condition: 'Fair',
    description: 'Used for 2 years. New tyres fitted last month. Perfect for campus commute.',
    location: 'IIT Bombay, H5',
    sellerId: 'student_rahul',
    collegeId: 'iitb',
    status: 'available',
    flagged: false,
    createdAt: isoDate(-7),
  },
  {
    id: 'mkt_laptop_stand',
    title: 'Ergonomic Laptop Stand – Aluminium',
    category: 'Accessories',
    price: 600,
    condition: 'Like New',
    description: 'Adjustable height. Fits up to 17" laptops. Barely used.',
    location: 'NIT Trichy, Opal Hostel',
    sellerId: 'student_ananya',
    collegeId: 'nitt',
    status: 'available',
    flagged: false,
    createdAt: isoDate(-2),
  },
  {
    id: 'mkt_arduino_kit',
    title: 'Arduino Uno Starter Kit',
    category: 'Electronics',
    price: 1200,
    condition: 'Good',
    description: 'Includes Arduino Uno R3, breadboard, jumper wires, sensors, LEDs, and tutorial book.',
    location: 'BITS Pilani, Bhagirath Bhawan',
    sellerId: 'student_karthik',
    collegeId: 'bits',
    status: 'reserved',
    flagged: false,
    createdAt: isoDate(-10),
  },
  {
    id: 'mkt_desk_lamp',
    title: 'LED Study Desk Lamp – Rechargeable',
    category: 'Accessories',
    price: 350,
    condition: 'Good',
    description: '3 brightness levels, flexible neck, USB-C charging. Battery lasts 8 hours.',
    location: 'DTU, BR Hostel',
    sellerId: 'student_sneha',
    collegeId: 'dtu',
    status: 'available',
    flagged: false,
    createdAt: isoDate(-1),
  },
];

// ── Communities ─────────────────────────────────────────────────
const COMMUNITIES = [
  {
    id: 'comm_cse_iitd',
    name: 'CSE Department – IIT Delhi',
    collegeId: 'iitd',
    type: 'mandatory',
    members: ['student_arjun', 'student_priya'],
    description: 'Official community for all Computer Science & Engineering students at IIT Delhi.',
  },
  {
    id: 'comm_coding_iitd',
    name: 'Competitive Programming Club',
    collegeId: 'iitd',
    type: 'optional',
    members: ['student_arjun'],
    description: 'Weekly contests, ICPC preparation, and algorithm discussions.',
  },
  {
    id: 'comm_ml_iitb',
    name: 'Machine Learning Society',
    collegeId: 'iitb',
    type: 'optional',
    members: ['student_rahul'],
    description: 'Research papers, Kaggle competitions, and hands-on ML projects.',
  },
  {
    id: 'comm_sports_iitb',
    name: 'Sports Council – IIT Bombay',
    collegeId: 'iitb',
    type: 'mandatory',
    members: ['student_rahul'],
    description: 'All sports activities, inter-hostel and inter-college events coordination.',
  },
  {
    id: 'comm_opensource_nitt',
    name: 'Open Source Club – NIT Trichy',
    collegeId: 'nitt',
    type: 'optional',
    members: ['student_ananya'],
    description: 'Contributing to open source projects and organising GSoC prep sessions.',
  },
  {
    id: 'comm_web3_bits',
    name: 'Web3 & Blockchain Society',
    collegeId: 'bits',
    type: 'optional',
    members: ['student_karthik'],
    description: 'Smart contracts, DeFi discussions, and hackathon participation.',
  },
];

// ── Clubs ──────────────────────────────────────────────────────
const CLUBS = [
  {
    id: 'club_robotics',
    name: 'Robotics Club',
    collegeId: 'iitd',
    category: 'Technical',
    purpose: 'Design and build autonomous robots for competitions like Robocon.',
    sponsor: 'Prof. Rajesh Kumar',
    status: 'approved',
    members: ['student_arjun', 'student_priya'],
    createdBy: 'student_arjun',
  },
  {
    id: 'club_debate',
    name: 'Debating Society',
    collegeId: 'iitd',
    category: 'Literary',
    purpose: 'Parliamentary debates, MUNs, and public speaking workshops.',
    sponsor: 'Dr. Sunita Rao',
    status: 'approved',
    members: ['student_priya'],
    createdBy: 'student_priya',
  },
  {
    id: 'club_quant',
    name: 'Quant Finance Club',
    collegeId: 'iitb',
    category: 'Finance',
    purpose: 'Algorithmic trading, quantitative analysis, and market simulations.',
    sponsor: 'Prof. Anil Deshmukh',
    status: 'approved',
    members: ['student_rahul'],
    createdBy: 'student_rahul',
  },
  {
    id: 'club_photography',
    name: 'Shutterbug – Photography Club',
    collegeId: 'nitt',
    category: 'Arts',
    purpose: 'Photo walks, editing workshops, and exhibition management.',
    sponsor: 'Dr. Kavitha Rajan',
    status: 'approved',
    members: ['student_ananya'],
    createdBy: 'student_ananya',
  },
  {
    id: 'club_blockchain',
    name: 'Blockchain Builders',
    collegeId: 'bits',
    category: 'Technical',
    purpose: 'Solidity boot-camps, smart contract auditsing, and DApp development.',
    sponsor: 'Prof. Suresh Pillai',
    status: 'pending',
    members: ['student_karthik'],
    createdBy: 'student_karthik',
  },
  {
    id: 'club_music',
    name: 'Crescendo – Music Club',
    collegeId: 'dtu',
    category: 'Cultural',
    purpose: 'Jamming sessions, band performances, and music theory workshops.',
    sponsor: 'Dr. Rajat Singh',
    status: 'approved',
    members: ['student_sneha'],
    createdBy: 'student_sneha',
  },
];

// ── Placements ─────────────────────────────────────────────────
const PLACEMENTS = [
  {
    id: 'placement_google',
    title: 'Software Engineer – Google',
    company: 'Google India',
    collegeId: 'iitd',
    deadline: isoDate(20),
    description: 'Software Engineering role at Google Bangalore. Competitive package with RSUs.',
    requirements: ['DSA', 'System Design', 'B.Tech CS/IT', 'CGPA ≥ 8.0'],
    applicants: ['student_arjun'],
    package: '₹32 LPA + RSUs',
  },
  {
    id: 'placement_microsoft',
    title: 'SDE Intern – Microsoft',
    company: 'Microsoft',
    collegeId: 'iitd',
    deadline: isoDate(18),
    description: 'Summer internship at Microsoft Hyderabad. Pre-placement offer for top performers.',
    requirements: ['C++/Java', 'CGPA ≥ 7.5', 'Pre-final year'],
    applicants: ['student_arjun', 'student_priya'],
    package: '₹1.2L/month stipend',
  },
  {
    id: 'placement_amazon',
    title: 'SDE-I – Amazon',
    company: 'Amazon',
    collegeId: 'iitb',
    deadline: isoDate(25),
    description: 'Full-time SDE-1 position. Work on AWS services at scale.',
    requirements: ['DSA', 'OOP', 'B.Tech any branch', 'CGPA ≥ 7.0'],
    applicants: ['student_rahul'],
    package: '₹28 LPA',
  },
  {
    id: 'placement_flipkart',
    title: 'Backend Engineer – Flipkart',
    company: 'Flipkart',
    collegeId: 'nitt',
    deadline: isoDate(15),
    description: 'Join the supply chain engineering team. High-impact, high-scale systems.',
    requirements: ['Java/Go', 'Microservices', 'B.Tech CS/IT'],
    applicants: ['student_ananya'],
    package: '₹24 LPA',
  },
  {
    id: 'placement_razorpay',
    title: 'Full Stack Developer – Razorpay',
    company: 'Razorpay',
    collegeId: 'bits',
    deadline: isoDate(12),
    description: 'Build fintech products used by millions of businesses across India.',
    requirements: ['React', 'Node.js', 'Ruby on Rails', 'CGPA ≥ 7.5'],
    applicants: [],
    package: '₹22 LPA',
  },
];

// ── Notices ────────────────────────────────────────────────────
const NOTICES = [
  {
    id: 'notice_exam_schedule',
    title: 'End Semester Exam Schedule Released',
    content: 'The end semester examination schedule for Spring 2025 has been published. Please check the academic portal for your personalised time-table. Contact the Examination Cell for any clashes.',
    collegeId: 'iitd',
    createdBy: 'faculty_rajesh',
    date: isoDate(-1),
    priority: 'high',
  },
  {
    id: 'notice_library_hours',
    title: 'Extended Library Hours During Exams',
    content: 'Central Library will remain open 24/7 during the exam period (May 1 – May 20). ID card is mandatory for entry after 11 PM.',
    collegeId: 'iitd',
    createdBy: 'faculty_rajesh',
    date: isoDate(-2),
    priority: 'medium',
  },
  {
    id: 'notice_placement_drive',
    title: 'Placement Drive – Week of May 12',
    content: 'Companies visiting this week: Google, Microsoft, Amazon, Flipkart. Ensure your placement profile is updated on the portal by May 10.',
    collegeId: 'iitb',
    createdBy: 'faculty_meera',
    date: isoDate(0),
    priority: 'high',
  },
  {
    id: 'notice_hostel_maintenance',
    title: 'Maintenance: Water Supply Disruption',
    content: 'Water supply will be disrupted on May 8 (10 AM – 4 PM) due to tank cleaning. Please store water in advance.',
    collegeId: 'nitt',
    createdBy: 'faculty_rajesh',
    date: isoDate(2),
    priority: 'medium',
  },
  {
    id: 'notice_hackathon_reg',
    title: 'HackNight DTU – Registrations Open',
    content: 'Registrations are now open for HackNight DTU. Teams of 2-4. Register at hacknight.dtu.ac.in before May 15.',
    collegeId: 'dtu',
    createdBy: 'faculty_rajesh',
    date: isoDate(-3),
    priority: 'low',
  },
];

// ── Competitions ───────────────────────────────────────────────
const COMPETITIONS = [
  {
    id: 'comp_coding_olympiad',
    title: 'National Coding Olympiad 2025',
    type: 'all-college',
    date: isoDate(30),
    description: 'All-India competitive programming contest. Top 100 coders win cash prizes and internship interviews.',
    participants: ['student_arjun', 'student_rahul', 'student_karthik'],
    status: 'upcoming',
    category: 'coding',
  },
  {
    id: 'comp_debate_nationals',
    title: 'Inter-College Debate Championship',
    type: 'all-college',
    date: isoDate(22),
    description: 'Oxford-style debate championship. Teams from 50+ colleges compete over 3 rounds.',
    participants: ['student_priya'],
    status: 'upcoming',
    category: 'cultural',
  },
  {
    id: 'comp_robocon',
    title: 'ABU Robocon India – Qualifier',
    type: 'area',
    date: isoDate(45),
    description: 'Design and build robots for the ABU Robocon challenge. Top 8 teams qualify for the Asia-Pacific round.',
    participants: ['student_arjun', 'student_ananya'],
    status: 'upcoming',
    category: 'coding',
  },
  {
    id: 'comp_sports_cricket',
    title: 'Inter-College Cricket Tournament',
    type: 'all-college',
    date: isoDate(10),
    description: 'T20 format inter-college cricket tournament hosted by IIT Bombay.',
    participants: ['student_rahul', 'student_sneha'],
    status: 'ongoing',
    category: 'sports',
  },
  {
    id: 'comp_design_challenge',
    title: 'UI/UX Design Challenge',
    type: 'all-college',
    date: isoDate(-5),
    description: 'Design a mobile banking app for rural India. Judged by industry designers from Flipkart and Zomato.',
    participants: ['student_priya', 'student_sneha'],
    status: 'completed',
    category: 'cultural',
  },
];

// ── SBTs (Wallet Soul-Bound Tokens) ───────────────────────────
const SBTS = [
  {
    id: 'sbt_arjun_hackathon',
    studentId: 'student_arjun',
    title: 'Hackathon Winner',
    reason: 'Won TechFest 2024 Hackathon – 1st Place',
    issuedBy: 'CollegeVerse',
    date: '2024-03-15',
    txHash: '0x7a3b9c12...4f8e',
  },
  {
    id: 'sbt_arjun_project',
    studentId: 'student_arjun',
    title: 'Best Project Award',
    reason: 'Best final year project – CS Department',
    issuedBy: 'IIT Delhi CS Dept',
    date: '2024-01-20',
    txHash: '0x2d5e8f01...a9c3',
  },
  {
    id: 'sbt_rahul_kaggle',
    studentId: 'student_rahul',
    title: 'Kaggle Expert',
    reason: 'Achieved Top 5% in Kaggle competition',
    issuedBy: 'CollegeVerse',
    date: '2024-04-01',
    txHash: '0x9e1f2a34...b7d0',
  },
  {
    id: 'sbt_ananya_oss',
    studentId: 'student_ananya',
    title: 'Open Source Contributor',
    reason: 'Contributed to Apache Kafka – PR merged',
    issuedBy: 'CollegeVerse',
    date: '2024-03-01',
    txHash: '0x4c6d8e9f...2a1b',
  },
  {
    id: 'sbt_karthik_eth',
    studentId: 'student_karthik',
    title: 'ETHIndia Runner-up',
    reason: '2nd Place at ETHIndia Hackathon 2024',
    issuedBy: 'CollegeVerse',
    date: '2024-01-05',
    txHash: '0x1a2b3c4d...5e6f',
  },
];

// ── Seed logic ─────────────────────────────────────────────────
const seedCollection = async (name, docs) => {
  console.log(`  Seeding ${name} (${docs.length} docs)...`);
  for (const doc of docs) {
    const { id, ...data } = doc;
    await db.collection(name).doc(id).set(data, { merge: true });
  }
  console.log(`  ✓ ${name}`);
};

const run = async () => {
  console.log('\n=== CollegeVerse Comprehensive Demo Data Seed ===\n');

  await seedCollection('students', STUDENTS);
  await seedCollection('faculty', FACULTY);
  await seedCollection('recruiters', RECRUITERS);
  await seedCollection('events', EVENTS);
  await seedCollection('teams', TEAMS);
  await seedCollection('gigs', GIGS);
  await seedCollection('gigApplications', GIG_APPLICATIONS);
  await seedCollection('marketplace', MARKETPLACE);
  await seedCollection('communities', COMMUNITIES);
  await seedCollection('clubs', CLUBS);
  await seedCollection('placements', PLACEMENTS);
  await seedCollection('notices', NOTICES);
  await seedCollection('competitions', COMPETITIONS);
  await seedCollection('sbts', SBTS);

  console.log('\n=== All demo data seeded successfully ===');
  console.log('\nCollections populated:');
  console.log('  • students     (6 students across 5 colleges)');
  console.log('  • faculty      (2 faculty members)');
  console.log('  • recruiters   (2 recruiters)');
  console.log('  • events       (6 upcoming events)');
  console.log('  • teams        (3 teams)');
  console.log('  • gigs         (5 micro-gigs)');
  console.log('  • gigApplications (5 applications)');
  console.log('  • marketplace  (6 items)');
  console.log('  • communities  (6 communities)');
  console.log('  • clubs        (6 clubs)');
  console.log('  • placements   (5 placement drives)');
  console.log('  • notices      (5 notices)');
  console.log('  • competitions (5 competitions)');
  console.log('  • sbts         (5 wallet SBTs)');
  console.log('');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
