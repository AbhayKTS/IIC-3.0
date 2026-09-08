module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/services/socket.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    'src/services/leaderboard.service.js': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    'src/middleware/requireRole.js': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    'src/middleware/requireVerifiedStudent.js': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    'src/services/audit.service.js': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    }
  }
};
