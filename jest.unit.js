module.exports = {
  moduleNameMapper: {
    '^src$': '<rootDir>/src',
    '^src/(.+)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['src/typings'],
  modulePaths: ['<rootDir>'],
  preset: 'ts-jest',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'unit-results.xml',
      },
    ],
    [
      '@jest-performance-reporter/core',
      {
        csvReportPath: 'reports/unit-perform.csv',
        errorAfterMs: 1000,
        jsonReportPath: 'reports/unit-perform.json',
        logLevel: 'warn',
        maxItems: 5,
        warnAfterMs: 500,
      },
    ],
  ],
  rootDir: './src/',
  testEnvironment: 'node',
  // prettier-ignore
  testPathIgnorePatterns: [
    '/node_modules./',
    '<rootDir>/(dist|reports)./',
  ],
  testRegex: '.spec.ts$',
};
