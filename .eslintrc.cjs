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
	// Root-only globs: these config files live at the repo root and aren't part of
	// `parserOptions.project`. A bare `*.js`/`*.cjs` also matched nested paths such as
	// the SvelteKit route directory `script/language/[lang].js`, silently excluding its
	// `+server.ts` from linting.
	ignorePatterns: ['/*.cjs', '/*.js', 'playwright.config.ts', 'scripts'],
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},
		{
			// `.well-known` is a dot-folder, so TypeScript's `**` include wildcard skips it
			// and these files aren't part of `tsconfig.json`. Parse them without the type
			// project so they still get linted (type-aware rules are disabled here).
			files: ['**/.well-known/**/*.ts'],
			parserOptions: {
				project: null
			},
			rules: {
				'@typescript-eslint/switch-exhaustiveness-check': 'off'
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
		'@typescript-eslint/explicit-module-boundary-types': 'error',
		curly: 'error'
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	}
};
