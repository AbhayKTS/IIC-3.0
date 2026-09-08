const fs = require('fs');
const path = require('path');
const winston = require('winston');

const config = require('../config');

const logDir = path.resolve(process.cwd(), config.logging.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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

const transports = config.env === 'production'
  ? [
      new winston.transports.Console({ format: prodFormat }),
      new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    ]
  : [new winston.transports.Console({ format: devFormat })];

const logger = winston.createLogger({
  level: config.logging.level,
  transports,
});

module.exports = logger;
