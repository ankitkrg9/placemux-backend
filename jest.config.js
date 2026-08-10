module.exports = {
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/src/tests/setup.js"],
    testMatch: ["<rootDir>/src/tests/**/*.test.js"],
    collectCoverage: true,
    coverageDirectory: "coverage",
};