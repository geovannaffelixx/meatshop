const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  testRegex: '.*\\.e2e-spec\\.ts$',
  testPathIgnorePatterns: [],
  testTimeout: 30000,
  maxWorkers: 1,
};
