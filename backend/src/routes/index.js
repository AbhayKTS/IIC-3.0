const express = require('express');

const config = require('../config');
const healthRoutes = require('./health.routes');
const v1Routes = require('./v1.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use(`${config.api.prefix}/health`, healthRoutes);
router.use(config.api.prefix, v1Routes);

module.exports = router;
