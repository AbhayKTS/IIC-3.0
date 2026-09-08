const fs = require('fs');
const path = require('path');
const winston = require('winston');

const config = require('../config');

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true })
);

const devFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${extra}`;
  })
);

const prodFormat = winston.format.combine(
  baseFormat,
  winston.format.json()
);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

let transports;
if (isServerless) {
  transports = [
    new winston.transports.Console({
      format: config.env === 'production' ? prodFormat : devFormat,
    }),
  ];
} else {
  const logDir = path.resolve(process.cwd(), config.logging.dir);
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (_) {}
  }

  transports = config.env === 'production'
    ? [
        new winston.transports.Console({ format: prodFormat }),
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
      ]
    : [new winston.transports.Console({ format: devFormat })];
}

const logger = winston.createLogger({
  level: config.logging.level,
  transports,
});

module.exports = logger;
