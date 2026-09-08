const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidUrl = (value) => {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const clampArray = (value, max) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max);
};

const isValidDateString = (value) => {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
};

const isStringArray = (value) => Array.isArray(value) && value.every((item) => isNonEmptyString(item));

module.exports = {
  isNonEmptyString,
  isValidUrl,
  clampArray,
  isValidDateString,
  isStringArray,
};
