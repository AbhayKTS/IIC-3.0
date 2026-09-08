const ok = (res, data, meta) => {
  const payload = { success: true, data: data || null };
  if (meta) payload.meta = meta;
  return res.status(200).json(payload);
};

const fail = (res, error, statusCode, details) => {
  return res.status(statusCode || 500).json({
    success: false,
    error: {
      message: error || 'Internal Server Error',
      details: details || null,
    },
  });
};

module.exports = {
  ok,
  fail,
};
