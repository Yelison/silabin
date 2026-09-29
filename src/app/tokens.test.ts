import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { THEME_COLORS } from "@/app/theme-colors";

// Los tokens de color se leen del propio `globals.css` (V14): el test no tiene una copia de
// los valores que pudiera quedarse atrás, y una tabla que no se puede leer falla, no pasa en
// vacío.
const CSS = readFileSync(
	join(process.cwd(), "src", "app", "globals.css"),
	"utf8",
);
const LAYOUT = readFileSync(
	join(process.cwd(), "src", "app", "layout.tsx"),
	"utf8",
);

/** Los `--color-<nombre>: #rrggbb` del bloque `@theme inline`, con el nombre sin prefijo. */
function leerTokens(css: string): Record<string, string> {
	const inicio = css.indexOf("@theme inline");
	if (inicio === -1) throw new Error("No hay bloque @theme inline");
	const abre = css.indexOf("{", inicio);
	const cierra = css.indexOf("}", abre);
	if (abre === -1 || cierra === -1) throw new Error("@theme inline sin cerrar");
	const bloque = css.slice(abre + 1, cierra);
	const tokens: Record<string, string> = {};
	for (const m of bloque.matchAll(
		/--color-([a-z][a-z0-9-]*)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g,
	)) {
		tokens[m[1] as string] = (m[2] as string).toLowerCase();
	}
	return tokens;
}

/** El valor de un token, o un error si el CSS no lo declara (nunca `undefined` en silencio). */
function token(tokens: Record<string, string>, nombre: string): string {
	const valor = tokens[nombre];
	if (valor === undefined) throw new Error(`Falta el token --color-${nombre}`);
	return valor;
}

function canales(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa de WCAG 2.x. */
function luminancia(hex: string): number {
	const [r, g, b] = canales(hex).map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
	const [la, lb] = [luminancia(a), luminancia(b)];
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** HSL con el tono en grados y `s`, `l` en 0..1. */
function hsl(hex: string): { h: number; s: number; l: number } {
	const [r, g, b] = canales(hex).map((c) => c / 255) as [
		number,
		number,
		number,
	];
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return { h: 0, s: 0, l };
	const s = d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === r) h = ((g - b) / d) % 6;
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return { h: (h * 60 + 360) % 360, s, l };
}

/** Rojo o verde «de bien o mal»: intenso (`s ≥ 0,5`, `l` media) y con el tono en rojo o verde. */
function esRojoOVerdeIntenso(hex: string): boolean {
	const { h, s, l } = hsl(hex);
	if (s < 0.5 || l < 0.25 || l > 0.75) return false;
	return h >= 345 || h <= 15 || (h >= 90 && h <= 160);
}

const TOKENS = leerTokens(CSS);

// La tabla de contraste de `docs/diseno-visual.md`: texto ≥ 4,5 y bordes de estado ≥ 3.
const PARES_TEXTO: [string, string][] = [
	["ink", "surface"],
	["ink", "card"],
	["ink", "calm"],
	["ink", "mark"],
	["ink", "action"],
	["ink-soft", "surface"],
	["ink-soft", "card"],
	["action-ink", "action"],
];
const PARES_BORDE: [string, string][] = [
	["calm-border", "surface"],
	["calm-border", "card"],
	["calm-border", "calm"],
	["mark-border", "surface"],
	["mark-border", "card"],
	["mark-border", "mark"],
];

describe("tokens de color (V14)", () => {
	it("CO1: los pares de texto llegan a 4,5 : 1 y los bordes de estado a 3 : 1", () => {
		const tokens = leerTokens(CSS);
		for (const [fg, bg] of PARES_TEXTO) {
			const ratio = contraste(token(tokens, fg), token(tokens, bg));
			expect(ratio, `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
		}
		for (const [fg, bg] of PARES_BORDE) {
			const ratio = contraste(token(tokens, fg), token(tokens, bg));
			expect(ratio, `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(3);
		}
	});

	it("CO1: la fórmula da los ratios de referencia de WCAG (negro/blanco 21, iguales 1)", () => {
		expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
		expect(contraste("#777777", "#777777")).toBeCloseTo(1, 5);
	});

	it("CO2: ningún token es un rojo ni un verde intenso", () => {
		const nombres = Object.keys(TOKENS);
		expect(nombres.length).toBeGreaterThanOrEqual(12);
		for (const nombre of nombres) {
			expect(
				esRojoOVerdeIntenso(token(TOKENS, nombre)),
				`--color-${nombre}: ${TOKENS[nombre]}`,
			).toBe(false);
		}
	});

	it("CO2: el detector sí marca un rojo y un verde intensos, y deja pasar el ámbar y el azul", () => {
		expect(esRojoOVerdeIntenso("#e53935")).toBe(true);
		expect(esRojoOVerdeIntenso("#22c55e")).toBe(true);
		expect(esRojoOVerdeIntenso("#f9be23")).toBe(false);
		expect(esRojoOVerdeIntenso("#5187c7")).toBe(false);
	});

	it("CO3: THEME_COLORS son los tokens surface y action, y el manifiesto los usa", () => {
		expect(THEME_COLORS.surface.toLowerCase()).toBe(token(TOKENS, "surface"));
		expect(THEME_COLORS.action.toLowerCase()).toBe(token(TOKENS, "action"));
		const m = manifest();
		expect(m.background_color).toBe(THEME_COLORS.surface);
		expect(m.theme_color).toBe(THEME_COLORS.action);
	});

	it("CO3: layout.tsx no lleva ningún color escrito y usa THEME_COLORS", () => {
		expect(LAYOUT).not.toMatch(/#[0-9a-fA-F]{6}\b/);
		expect(LAYOUT).toMatch(/themeColor:\s*THEME_COLORS\.action/);
	});

	it("CO4: un CSS sin --color-ink lanza un error, no da pares vacíos", () => {
		const sinInk = "@theme inline {\n\t--color-surface: #fff8ec;\n}";
		const tokens = leerTokens(sinInk);
		expect(() => token(tokens, "ink")).toThrow(/--color-ink/);
		expect(() => leerTokens("body { color: red; }")).toThrow(/@theme inline/);
	});
});
