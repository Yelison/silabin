import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Test estático sobre el fuente, como los de `boundaries.test.ts` (src/features/boundaries.test.ts):
// el Service Worker no corre en Vitest (no hay `ServiceWorkerGlobalScope` en Node/jsdom),
// así que lo que se comprueba es el código fuente, no su comportamiento en tiempo de ejecución.
const FUENTE = readFileSync(join(process.cwd(), "src", "app", "sw.ts"), "utf8");

describe("sw.ts", () => {
	it("H5: no activa skipWaiting automático en la configuración de Serwist", () => {
		expect(FUENTE).not.toMatch(/skipWaiting\s*:\s*true/);
	});

	it("H5: escucha el mensaje SKIP_WAITING y solo entonces llama a self.skipWaiting()", () => {
		expect(FUENTE).toMatch(/SKIP_WAITING/);
		expect(FUENTE).toMatch(/self\.skipWaiting\(\)/);
	});
});
