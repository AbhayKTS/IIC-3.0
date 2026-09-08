const { Pool } = require('pg');

const config = require('../config');
const logger = require('../utils/logger');

// Pooling protects the database under high concurrency.
const pool = new Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl,
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL pool error', { error });
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
};
