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

/**
 * Trazo de referencia para un ítem `letter`. Lanza si el ítem no es una letra, si no hay
 * trazo para su texto, o siempre que se pida la minúscula (llega en el Plan 6).
 */
export function glyphFor(item: Item, letterCase: LetterCase): Glyph {
	if (item.kind !== "letter") {
		throw new Error(
			`glyphFor solo traza ítems "letter", y "${item.id}" es "${item.kind}"`,
		);
	}
	if (letterCase === "lower") {
		throw new Error(
			"El trazo de minúsculas llega en el Plan 6: por ahora solo hay mayúsculas",
		);
	}
	const glyph = UPPER_GLYPHS[item.text];
	if (glyph === undefined) {
		throw new Error(`No hay trazo de referencia para la letra "${item.text}"`);
	}
	return glyph;
}
