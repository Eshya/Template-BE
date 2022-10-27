module.exports = {
    preset: '@shelf/jest-mongodb',
    clearMocks: true,
    moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
    testRegex: "/*.test.js$",
    collectCoverageFrom: ['**/routes/**',],
    collectCoverage: true,
    coverageReporters: ["lcov"],
    coverageDirectory: "./coverage",
    testPathIgnorePatterns: ['<rootDir>/node_modules/'],
    coveragePathIgnorePatterns: ['<rootDir>/node_modules/'],
    coverageThreshold: {
        "global": {
            "branches": 0,
            "functions": 0,
            "lines": 0,
            "statements": 0
        }
    }
}   