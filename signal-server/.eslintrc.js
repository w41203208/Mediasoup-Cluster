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
		'no-unused-vars': ['error'],
		'no-undef': ['error'],
		'no-alert': ['error'],
		'no-empty-pattern': ['error'],
		'array-callback-return': ['error'],
		'lines-around-comment': ['error', { beforeLineComment: true, afterLineComment: false }],
	},
};
