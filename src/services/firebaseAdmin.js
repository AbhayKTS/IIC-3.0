const fs = require('fs');
const admin = require('firebase-admin');

const config = require('../config');

let app;

const initFirebaseAdmin = () => {
  if (app) return app;

  const hasInlineCreds = !!(
    config.firebase.projectId
    && config.firebase.clientEmail
    && config.firebase.privateKey
  );

  const isTestEmulator = config.env === 'test' && process.env.FIRESTORE_EMULATOR_HOST;

  const isCloudRun = !!process.env.K_SERVICE;
  const isRender = !!process.env.RENDER;

  // Support GOOGLE_APPLICATION_CREDENTIALS_JSON env var (Render, etc.)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !hasInlineCreds) {
    try {
      const sa = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      config.firebase.projectId = config.firebase.projectId || sa.project_id;
      config.firebase.clientEmail = sa.client_email;
      config.firebase.privateKey = sa.private_key;
      // Clear serviceAccountPath so we use inline creds instead
      config.firebase.serviceAccountPath = '';
    } catch (_) { /* ignore parse errors */ }
  }

  const hasInlineCredsUpdated = !!(
    config.firebase.projectId
    && config.firebase.clientEmail
    && config.firebase.privateKey
  );

  // If serviceAccountPath is set but doesn't exist, clear it (e.g. Render deploy)
  if (config.firebase.serviceAccountPath && !fs.existsSync(config.firebase.serviceAccountPath)) {
    config.firebase.serviceAccountPath = '';
  }

  if (!hasInlineCredsUpdated && !hasInlineCreds && !config.firebase.serviceAccountPath && !isTestEmulator && !isCloudRun && !isRender) {
    throw new Error('Firebase admin credentials are missing');
  }

  let credential;

  if (config.firebase.serviceAccountPath) {
    if (!fs.existsSync(config.firebase.serviceAccountPath)) {
      throw new Error('Firebase service account path does not exist');
    }
    const raw = fs.readFileSync(config.firebase.serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    credential = admin.credential.cert(serviceAccount);
  } else if (hasInlineCreds || hasInlineCredsUpdated) {
    credential = admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
    });
  } else {
    credential = admin.credential.applicationDefault();
  }

  app = admin.initializeApp({
    credential,
    projectId: config.firebase.projectId || process.env.GCLOUD_PROJECT || 'demo-test',
    storageBucket: config.firebase.storageBucket || undefined,
  });

  return app;
};

initFirebaseAdmin();

module.exports = admin;
