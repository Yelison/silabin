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

	it("FN1: Nunito en 600, 700 y 800 con --font-nunito, y ambas variables en <html>", () => {
		expect(FUENTE).toMatch(
			/import \{[^}]*\bNunito\b[^}]*\} from "next\/font\/google"/,
		);
		const nunito = FUENTE.match(/Nunito\(\{[\s\S]*?\}\);/)?.[0] ?? "";
		expect(nunito).toMatch(/weight:\s*\["600",\s*"700",\s*"800"\]/);
		expect(nunito).toMatch(/variable:\s*"--font-nunito"/);
		expect(FUENTE).toMatch(
			/className=\{`[^`]*\$\{andika\.variable\}[^`]*\$\{nunito\.variable\}[^`]*`\}|className=\{`[^`]*\$\{nunito\.variable\}[^`]*\$\{andika\.variable\}[^`]*`\}/,
		);
	});

	it("FN2: --font-sans empieza por Nunito, --font-reading sigue en Andika y body no fija font-weight (MC16)", () => {
		const css = readFileSync(
			join(process.cwd(), "src", "app", "globals.css"),
			"utf8",
		);
		expect(css).toMatch(/--font-sans:\s*var\(--font-nunito\)/);
		expect(css).toMatch(/--font-reading:\s*var\(--font-andika\);/);
		const body = css.match(/\nbody\s*\{[^}]*\}/)?.[0] ?? "";
		expect(body).not.toBe("");
		expect(body).not.toMatch(/font-weight/);
	});
});
