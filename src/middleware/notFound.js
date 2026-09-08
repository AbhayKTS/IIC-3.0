const { fail } = require('../utils/response');

const notFoundHandler = (req, res) => {
  return fail(res, 'Route not found', 404);
};

module.exports = {
  notFoundHandler,
};
