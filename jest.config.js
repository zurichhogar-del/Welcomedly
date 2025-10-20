export default {
    testEnvironment: 'node',
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/_archive/**',
        '!src/public/**',
        '!src/index.js',
        '!src/database/seed*.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
