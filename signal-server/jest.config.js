/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	testPathIgnorePatterns: ['./node_modules/'],
	testRegex: '(/test/.*|(\\.|/)(defg|spec))\\.ts?$',
};
