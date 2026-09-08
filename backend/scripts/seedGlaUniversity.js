const admin = require('../src/services/firebaseAdmin');

const db = admin.firestore();

async function seedGla() {
  const domain = 'gla.ac.in';
  console.log(`Checking if ${domain} already exists in colleges collection...`);

  const existing = await db.collection('colleges').where('domain', '==', domain).get();
  if (!existing.empty) {
    console.log(`GLA University (${domain}) already exists with ID: ${existing.docs[0].id}`);
    process.exit(0);
  }

  const glaDoc = {
    collegeId: 'c_gla',
    name: 'GLA University',
    location: 'Mathura',
    domain: 'gla.ac.in',
    isActive: true,
    ranking: 10,
    type: 'Private',
    studentCount: 15000,
    departments: ['CSE', 'ECE', 'Mechanical', 'Civil', 'Management', 'Pharmacy'],
    description: 'Leading NAAC A+ accredited university in Mathura, Uttar Pradesh.',
    established: 1998,
    contactEmail: 'admissions@gla.ac.in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('colleges').doc('c_gla').set(glaDoc, { merge: true });
  console.log('Successfully seeded GLA University (gla.ac.in) into Firestore colleges collection!');
  process.exit(0);
}

seedGla().catch((err) => {
  console.error('Failed to seed GLA University:', err);
  process.exit(1);
});
