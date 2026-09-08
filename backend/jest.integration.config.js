module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
};
