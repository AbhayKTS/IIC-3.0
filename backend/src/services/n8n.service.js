const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Dispatches an event payload to an external n8n webhook workflow asynchronously.
 * Designed to be non-blocking: network issues or n8n downtime will NOT fail the caller.
 *
 * @param {string} event - Event name (e.g. 'student_verified', 'resume_parsed', 'job_match')
 * @param {object} data - Event payload data
 * @returns {Promise<{ triggered: boolean, error?: string }>}
 */
async function triggerN8nWorkflow(event, data = {}) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.debug(`[n8n] N8N_WEBHOOK_URL not configured, skipping event: ${event}`);
    return { triggered: false, reason: 'unconfigured' };
  }

  const internalKey = process.env.N8N_INTERNAL_KEY || '';

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(internalKey ? { 'x-n8n-internal-key': internalKey } : {}),
      },
      timeout: 5000, // 5 second timeout to keep operations responsive
    });

    logger.info(`[n8n] Workflow triggered successfully for event: ${event}, status: ${response.status}`);
    return { triggered: true, status: response.status };
  } catch (error) {
    // Non-blocking: log warning and let application continue
    logger.warn(`[n8n] Failed to trigger n8n workflow for event ${event}: ${error.message}`);
    return { triggered: false, error: error.message };
  }
}

module.exports = {
  triggerN8nWorkflow,
};
