module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: [
		'plugin:svelte/recommended',
		'plugin:svelte/prettier',
		'plugin:@typescript-eslint/recommended',
		'prettier'
	],
	plugins: ['svelte', '@typescript-eslint'],
	// All because of `parserOptions.project`
	ignorePatterns: ['*.cjs', '*.js', 'playwright.config.ts', 'scripts'],
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},
		{
			// A processor's declaration and front reach the browser: only its `.server.ts` may load server code.
			files: ['src/lib/payment-processors/**'],
			excludedFiles: ['*.server.ts', '*.test.ts'],
			rules: {
				'@typescript-eslint/no-restricted-imports': [
					'error',
					{
						patterns: [
							{
								group: ['$lib/server/**', '**/*.server'],
								message: 'Only a processor.server.ts may import server code.',
								allowTypeImports: true
							}
						]
					}
				]
			}
		}
	],
	settings: {
		'svelte3/typescript': () => require('typescript')
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		project: 'tsconfig.json',
		extraFileExtensions: ['.svelte']
	},
	rules: {
		'no-empty': 'off',
		eqeqeq: 'error',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/no-unused-vars': 'error',
		'@typescript-eslint/switch-exhaustiveness-check': 'error',
		curly: 'error'
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	}
};
