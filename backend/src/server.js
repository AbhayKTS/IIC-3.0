const http = require('http');

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { initSocket } = require('./services/socket');
const { captureException } = require('./services/errorTracking');

const server = http.createServer(app);

initSocket(server, { cors: config.security.cors });

server.listen(config.server.port, () => {
  logger.info(`CollegeVerse API listening on port ${config.server.port}`);
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  captureException(reason, { tags: { source: 'unhandledRejection' } });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  captureException(error, { tags: { source: 'uncaughtException' } });
  shutdown('uncaughtException');
});
