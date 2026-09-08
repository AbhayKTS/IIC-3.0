const path = require('path');
const dotenv = require('dotenv');

const inferEnv = () => {
  if (process.env.NODE_ENV) return process.env.NODE_ENV;
  if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.K_SERVICE) return 'production';
  return 'development';
};

const env = inferEnv();

const envFile = path.resolve(process.cwd(), `.env.${env}`);
dotenv.config({ path: envFile });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const parseOrigins = (value) => {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const buildCorsOriginMatcher = ({ origins, allowNetlifyPreviews }) => {
  return (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origins.includes(origin)) return callback(null, true);

    if (allowNetlifyPreviews && /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  };
};

const resolveTrustProxy = ({ nodeEnv, rawValue }) => {
  if (nodeEnv === 'production') {
    if (rawValue === 'false') return false;
    if (rawValue === 'true') return true;
    return true;
  }

  return false;
};

const envDefaults = {
  development: {
    corsOrigin: 'http://localhost:3000',
    rateLimitMax: 300,
    logLevel: 'debug',
    requireEmailVerification: false,
  },
  staging: {
    corsOrigin: 'https://staging.collegeverse.in',
    rateLimitMax: 200,
    logLevel: 'info',
    requireEmailVerification: true,
  },
  production: {
    corsOrigin: 'https://collegeverse1.netlify.app,https://collegeverse.in',
    rateLimitMax: 100,
    logLevel: 'info',
    requireEmailVerification: false,
  },
};

const defaults = envDefaults[env] || envDefaults.development;
const corsOrigins = parseOrigins(process.env.CORS_ORIGIN || defaults.corsOrigin);
const allowNetlifyPreviews = process.env.CORS_ALLOW_NETLIFY_PREVIEWS
  ? process.env.CORS_ALLOW_NETLIFY_PREVIEWS === 'true'
  : env === 'production';

const baseConfig = {
  env,
  server: {
    port: Number(process.env.PORT) || 4000,
    bodyLimit: process.env.BODY_LIMIT || '1mb',
    trustProxy: resolveTrustProxy({ nodeEnv: env, rawValue: process.env.TRUST_PROXY }),
  },
  api: {
    prefix: '/api/v1',
  },
  security: {
    cors: {
      origin: buildCorsOriginMatcher({ origins: corsOrigins, allowNetlifyPreviews }),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX) || defaults.rateLimitMax,
    },
  },
  db: {
    connectionString: process.env.DATABASE_URL || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  logging: {
    level: process.env.LOG_LEVEL || defaults.logLevel,
    dir: process.env.LOG_DIR || 'logs',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  },
  observability: {
    sentryDsn: process.env.SENTRY_DSN || '',
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    metricsLogging: process.env.METRICS_LOGGING !== 'false',
  },
  auth: {
    requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFIED
      ? process.env.AUTH_REQUIRE_EMAIL_VERIFIED === 'true'
      : defaults.requireEmailVerification,
  },
  web3: {
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contractAddress: process.env.SBT_CONTRACT_ADDRESS || '',
    adminPrivateKey: process.env.ADMIN_WALLET_PRIVATE_KEY || '',
    walletEncryptionKey: process.env.WALLET_ENCRYPTION_KEY || '',
  },
};

module.exports = baseConfig;
