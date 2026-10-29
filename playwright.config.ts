import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'npm run build && npm run preview',
		// `npm run preview` serves on 5012. This said 4173 — Vite's default — so the server was
		// never found and every run timed out before a single test executed.
		port: 5012,
		// The command builds first, which the default 60s does not cover on a cold cache.
		timeout: 180_000,
		env: {
			// The suite creates a super admin and writes to the database. Keep that out of the
			// database a developer is using for their own shop.
			MONGODB_DB: 'bebop-e2e'
		}
	},
	// One worker, in order: the tests share one database and one shop.
	workers: 1,
	fullyParallel: false,
	// The first page of a freshly built server is compiled on demand, and signing in waits out
	// a breach-check call to an API a CI box often cannot reach. Thirty seconds covers neither.
	timeout: 60_000,
	testDir: 'tests',
	projects: [
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'e2e',
			dependencies: ['setup'],
			// Signing in once and reusing the session is not only faster: the login route allows
			// ten attempts per IP per five minutes, so a suite that re-authenticates per test
			// starts failing with a 429 partway through.
			use: { storageState: 'playwright/.auth/admin.json' },
			testIgnore: /auth\.setup\.ts/
		}
	]
};

export default config;
