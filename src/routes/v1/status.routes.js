const express = require('express');
const { ok } = require('../../utils/response');
const config = require('../../config');

const router = express.Router();

router.get('/', (req, res) => {
  return ok(res, {
    status: 'running',
    env: config.env,
    version: process.env.APP_VERSION || 'unknown',
  });
});

module.exports = router;
