const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');

const config = require('./config');
const routes = require('./routes');
const { requestMetrics } = require('./middleware/requestMetrics');
const { notFoundHandler } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
// Required when running behind load balancers or a reverse proxy.
app.set('trust proxy', Boolean(config.server.trustProxy));

app.use(helmet({
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors(config.security.cors));

// Global rate limit keeps abuse from impacting shared infrastructure.
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

const openApiPath = path.resolve(process.cwd(), 'docs', 'openapi.yaml');
const openApiSpec = yaml.load(openApiPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(requestMetrics);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
