import type { Item } from "@/content/types";

/** Caja de altura 1, `y` hacia abajo, `x` de 0 a `width`. Trazos en el orden escolar. */
export type GlyphPoint = { x: number; y: number };
export type Glyph = { width: number; strokes: GlyphPoint[][] };
export type LetterCase = "upper" | "lower";

function round4(n: number): number {
	const rounded = Math.round(n * 10000) / 10000;
	return rounded === 0 ? 0 : rounded;
}

function line(
	...points: ReadonlyArray<readonly [number, number]>
): GlyphPoint[] {
	return points.map(([x, y]) => ({ x, y }));
}

/** Punto en `(cx + rx·cos θ, cy + ry·sin θ)`, de `fromDeg` a `toDeg` en `steps` pasos. */
function arc(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	fromDeg: number,
	toDeg: number,
	steps: number,
): GlyphPoint[] {
	const points: GlyphPoint[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const deg = fromDeg + ((toDeg - fromDeg) * i) / steps;
		const rad = (deg * Math.PI) / 180;
		points.push({
			x: round4(cx + rx * Math.cos(rad)),
			y: round4(cy + ry * Math.sin(rad)),
		});
	}
	return points;
}

export const UPPER_GLYPHS: Readonly<Record<string, Glyph>> = {
	a: {
		width: 0.8,
		strokes: [
			line([0.4, 0], [0, 1]),
			line([0.4, 0], [0.8, 1]),
			line([0.152, 0.62], [0.648, 0.62]),
		],
	},
	e: {
		width: 0.6,
		strokes: [
			line([0, 0], [0, 1]),
			line([0, 0], [0.6, 0]),
			line([0, 0.5], [0.5, 0.5]),
			line([0, 1], [0.6, 1]),
		],
	},
	i: {
		width: 0.2,
		strokes: [line([0.1, 0], [0.1, 1])],
	},
	o: {
		width: 0.8,
		strokes: [arc(0.4, 0.5, 0.4, 0.5, -90, -450, 48)],
	},
	u: {
		width: 0.7,
		strokes: [
			[
				{ x: 0, y: 0 },
				...arc(0.35, 0.65, 0.35, 0.35, 180, 0, 24),
				{ x: 0.7, y: 0 },
			],
		],
	},
	m: {
		width: 0.9,
		strokes: [
			line([0, 0], [0, 1]),
			line([0, 0], [0.45, 0.6], [0.9, 0]),
			line([0.9, 0], [0.9, 1]),
		],
	},
	l: {
		width: 0.6,
		strokes: [line([0, 0], [0, 1]), line([0, 1], [0.6, 1])],
	},
	s: {
		width: 0.6,
		strokes: [
			[
				...arc(0.3, 0.25, 0.25, 0.25, -20, -270, 24),
				...arc(0.3, 0.75, 0.25, 0.25, -90, 160, 24).slice(1),
			],
		],
	},
	p: {
		width: 0.6,
		strokes: [
			line([0, 0], [0, 1]),
			[
				{ x: 0, y: 0 },
				...arc(0.3, 0.275, 0.275, 0.275, -90, 90, 20),
				{ x: 0, y: 0.55 },
			],
		],
	},
};

export const LOWER_GLYPHS: Readonly<Record<string, Glyph>> = {
	// Un solo piso (óvalo más palo), como en Andika: no el triángulo de la mayúscula. El óvalo
	// llena la caja y el palo sale tangente a su borde derecho (D28: medido, ver
	// LOWER_CONFUSABLE_PAIRS — a/o y a/u salen confundibles con esta forma natural).
	a: {
		width: 0.7,
		strokes: [
			arc(0.35, 0.5, 0.35, 0.5, -90, -450, 48),
			line([0.7, 0], [0.7, 1]),
		],
	},
	// Barra + óvalo abierto por abajo a la derecha (no por arriba): la barra cruza el óvalo a
	// media altura y el hueco queda hacia las 4-5 en punto, como en una "e" real.
	e: {
		width: 0.6,
		strokes: [
			line([0.05, 0.5], [0.55, 0.5]),
			// Ángulo decreciente = sentido antihorario (igual que la "o": arriba, izquierda,
			// abajo), empezando junto a la barra y terminando abajo a la derecha, donde queda
			// el hueco: de la barra hacia arriba y alrededor, no al revés.
			arc(0.3, 0.5, 0.3, 0.5, 370, 70, 40),
		],
	},
	// Trazo corto propio (el punto) más el palo, con hueco > TOLERANCE entre los dos (S24).
	i: {
		width: 0.2,
		strokes: [line([0.1, 0.3], [0.1, 1]), line([0.1, 0], [0.1, 0.1])],
	},
	// Mismo óvalo que la mayúscula: "o"/"O" son la misma forma, solo cambia el tamaño real.
	o: {
		width: 0.8,
		strokes: [arc(0.4, 0.5, 0.4, 0.5, -90, -450, 48)],
	},
	// Mismo trazo que la mayúscula: "u"/"U" son la misma forma.
	u: {
		width: 0.7,
		strokes: [
			[
				{ x: 0, y: 0 },
				...arc(0.35, 0.65, 0.35, 0.35, 180, 0, 24),
				{ x: 0.7, y: 0 },
			],
		],
	},
	// Tres palos y dos arcos que los unen por arriba (un arco por palo, no el zigzag de la
	// mayúscula).
	m: {
		width: 1,
		strokes: [
			line([0.05, 0.2], [0.05, 1]),
			[...arc(0.275, 0.2, 0.225, 0.2, 180, 360, 20), { x: 0.5, y: 1 }],
			[...arc(0.725, 0.2, 0.225, 0.2, 180, 360, 20), { x: 0.95, y: 1 }],
		],
	},
	// Un palo simple, de punta a punta: la "l" no lleva el remate de la "L" mayúscula.
	l: {
		width: 0.2,
		strokes: [line([0.1, 0], [0.1, 1])],
	},
	// Mismo trazo que la mayúscula: "s"/"S" son la misma forma.
	s: {
		width: 0.6,
		strokes: [
			[
				...arc(0.3, 0.25, 0.25, 0.25, -20, -270, 24),
				...arc(0.3, 0.75, 0.25, 0.25, -90, 160, 24).slice(1),
			],
		],
	},
	// El palo va de 0 a 1 y la panza de 0 a ≈0.55, igual que en la mayúscula (D28).
	p: {
		width: 0.6,
		strokes: [
			line([0, 0], [0, 1]),
			[
				{ x: 0, y: 0 },
				...arc(0.3, 0.275, 0.275, 0.275, -90, 90, 20),
				{ x: 0, y: 0.55 },
			],
		],
	},
};

/**
 * Pares (dibujado, pedido) que puntúan `correct` con las constantes de partida (`TOLERANCE`,
 * `MIN_COVERAGE`, `MIN_PRECISION`), medidos con el mismo método que G15 (ver
 * `glyphs.test.ts`, L3): ninguna otra combinación de las 9 minúsculas debe pasar.
 *
 * `e`/`s`/`p` y `o`/`u` repiten los pares ya conocidos de las mayúsculas (G15). `i`/`l` es
 * nuevo (el palo sin punto de la "i" se confunde con la "l") y también lo son `a`/`o` y
 * `a`/`u`: la "a" de un piso (óvalo + palo tangente, la forma real de Andika) comparte
 * óvalo con "o" y "u". Encogerla para esquivar el par la dejaba con un hueco entre el óvalo
 * y el palo — se midió y no se retocó la geometría para forzar el resultado (D28): queda
 * para que el coordinador decida si hace falta una forma más distinta para la "a".
 */
export const LOWER_CONFUSABLE_PAIRS: ReadonlyArray<readonly [string, string]> =
	[
		["a", "o"],
		["o", "a"],
		["a", "u"],
		["u", "a"],
		["e", "s"],
		["s", "e"],
		["e", "p"],
		["p", "e"],
		["i", "l"],
		["l", "i"],
		["o", "u"],
		["u", "o"],
	];

/**
 * Trazo de referencia para un ítem `letter`. Lanza si el ítem no es una letra, o si no hay
 * trazo para su texto en el caso pedido.
 */
export function glyphFor(item: Item, letterCase: LetterCase): Glyph {
	if (item.kind !== "letter") {
		throw new Error(
			`glyphFor solo traza ítems "letter", y "${item.id}" es "${item.kind}"`,
		);
	}
	const glyphs = letterCase === "lower" ? LOWER_GLYPHS : UPPER_GLYPHS;
	const glyph = glyphs[item.text];
	if (glyph === undefined) {
		throw new Error(`No hay trazo de referencia para la letra "${item.text}"`);
	}
	return glyph;
}
