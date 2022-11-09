module.exports = {
	env: {
		es2021: true,
		node: true,
	},
	extends: [
		// 'eslint:recommended',
		// 'plugin:@typescript-eslint/recommended'
		'prettier',
	],
	overrides: [],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
	},
	plugins: ['@typescript-eslint'],
	rules: {
		'indent': ['error', 'tab', { SwitchCase: 1 }],
		// 'linebreak-style': [
		// 	'error',
		// 	'windows'
		// ],
		'quotes': ['error', 'single'],
		'semi': ['error', 'always'],
		'no-const-assign': ['error'],
		'no-undef': ['error'],
		'no-alert': ['error'],
		'prefer-const': ['warn'],
		'no-empty-pattern': ['warn'],
		'array-callback-return': ['error'],
		'lines-around-comment': ['warn', { beforeLineComment: true, afterLineComment: false, beforeBlockComment: true }],
	},
};
