import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Test estático sobre el fuente, como `sw.test.ts`: `layout.tsx` importa `next/font` y no se
// puede montar en Vitest, así que se comprueba lo que declara.
const FUENTE = readFileSync(
	join(process.cwd(), "src", "app", "layout.tsx"),
	"utf8",
);

describe("layout.tsx", () => {
	it("I1: SerwistProvider no recarga la app cuando vuelve la red (S11: nunca a mitad de sesión)", () => {
		// Por defecto `reloadOnOnline` vale `true` y hace `location.reload()` en cada evento `online`.
		expect(FUENTE).toMatch(/reloadOnOnline=\{false\}/);
	});
});
