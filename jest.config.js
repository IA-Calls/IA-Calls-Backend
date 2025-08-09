module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
