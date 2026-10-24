const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  setupFiles: ['<rootDir>/test/e2e-environment.ts'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  testPathIgnorePatterns: [],
  testTimeout: 30000,
  maxWorkers: 1,
};
