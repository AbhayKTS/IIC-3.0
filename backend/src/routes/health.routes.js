const express = require('express');
const config = require('../config');
const db = require('../services/firestore');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  let dbStatus = { ok: true };
  let lastAnalyticsSnapshotTime = null;

  try {
    await db.collection('_health').doc('ping').get();
  } catch (error) {
    dbStatus = { ok: false, error: error.message };
  }

  if (dbStatus.ok) {
    try {
      const snapshot = await db
        .collection('analyticsSnapshots')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        lastAnalyticsSnapshotTime = snapshot.docs[0].data().createdAt || null;
      }
    } catch (error) {
      lastAnalyticsSnapshotTime = null;
    }
  }

  return ok(res, {
    status: dbStatus.ok ? 'ok' : 'degraded',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    env: config.env,
    dbConnected: dbStatus.ok,
    dbError: dbStatus.ok ? null : (dbStatus.error || 'Unknown Firestore error'),
    storageBucketConfigured: Boolean(config.firebase.storageBucket),
    storageBucket: config.firebase.storageBucket || null,
    lastAnalyticsSnapshotTime,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
