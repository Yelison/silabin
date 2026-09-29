import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Chromium con el dispositivo iPhone 13 (viewport, toque y móvil). WebKit solo si PW_WEBKIT=1:
// en WSL necesita `playwright install-deps`, que pide sudo y decide el autor.
const proyectos = [
	{
		name: "iphone",
		use: {
			...devices["iPhone 13"],
			// `devices["iPhone 13"]` trae `defaultBrowserType: "webkit"`: se fuerza Chromium.
			defaultBrowserType: "chromium" as const,
			browserName: "chromium" as const,
		},
	},
	...(process.env.PW_WEBKIT === "1"
		? [{ name: "webkit", use: { ...devices["iPhone 13"] } }]
		: []),
];

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.spec.ts",
	// Una sesión completa con toques y esperas de celebración es larga.
	timeout: 180_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
		serviceWorkers: "allow",
	},
	projects: proyectos,
	webServer: {
		command: `pnpm build && pnpm start -p ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000,
	},
});
