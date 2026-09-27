import { describe, expect, it } from "vitest";
import type { Glyph, GlyphPoint } from "@/content/glyphs";
import {
	guideLevel,
	MIN_COVERAGE,
	SAMPLE_STEP,
	scoreTrace,
	type TraceStroke,
} from "@/engine/trace";
import type { Box } from "@/engine/types";

/** Letra sintética L: vertical de 0 a 1, más base horizontal de 0.6. */
const L: Glyph = {
	width: 0.6,
	strokes: [
		[
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
		],
		[
			{ x: 0, y: 1 },
			{ x: 0.6, y: 1 },
		],
	],
};

/** Letra sintética T_CORTA: vertical de 0 a 1, más una barra de 0.4 en su extremo superior. */
const T_CORTA: Glyph = {
	width: 0.4,
	strokes: [
		[
			{ x: 0.2, y: 0 },
			{ x: 0.2, y: 1 },
		],
		[
			{ x: 0, y: 0 },
			{ x: 0.4, y: 0 },
		],
	],
};

/** Reimplementación del remuestreo, solo para construir tinta de prueba (no se exporta
 * desde trace.ts: es un detalle interno). */
function resampleForTest(stroke: readonly GlyphPoint[]): GlyphPoint[] {
	const first = stroke[0];
	if (first === undefined) return [];
	if (stroke.length === 1) return [first];
	const out: GlyphPoint[] = [first];
	let traveled = 0;
	let nextSample = SAMPLE_STEP;
	for (let i = 1; i < stroke.length; i += 1) {
		const a = stroke[i - 1];
		const b = stroke[i];
		if (a === undefined || b === undefined) continue;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const segLen = Math.hypot(dx, dy);
		if (segLen === 0) continue;
		while (nextSample <= traveled + segLen) {
			const t = (nextSample - traveled) / segLen;
			out.push({ x: a.x + dx * t, y: a.y + dy * t });
			nextSample += SAMPLE_STEP;
		}
		traveled += segLen;
	}
	const last = stroke[stroke.length - 1];
	const lastOut = out[out.length - 1];
	if (
		last !== undefined &&
		(lastOut === undefined || lastOut.x !== last.x || lastOut.y !== last.y)
	) {
		out.push(last);
	}
	return out;
}

/** El "temblor" de G2: remuestrea cada trazo y desplaza su muestra i. */
function withTremor(strokes: readonly GlyphPoint[][]): TraceStroke[] {
	return strokes.map((stroke) =>
		resampleForTest(stroke).map((p, i) => ({
			x: p.x + (i % 2 === 1 ? 0.08 : -0.08),
			y: p.y + (i % 3 !== 0 ? 0.04 : -0.04),
		})),
	);
}

function shiftX(strokes: readonly GlyphPoint[][], dx: number): TraceStroke[] {
	return strokes.map((stroke) => stroke.map((p) => ({ x: p.x + dx, y: p.y })));
}

describe("scoreTrace", () => {
	it("G1: la propia tinta de L puntúa perfecto", () => {
		const result = scoreTrace(L, L.strokes);
		expect(result).toEqual({ correct: true, coverage: [1, 1], precision: 1 });
	});

	it("G2: temblor pequeño en cada muestra sigue siendo correcto", () => {
		const result = scoreTrace(L, withTremor(L.strokes));
		expect(result.correct).toBe(true);
	});

	it("G3: T_CORTA con tinta solo en la vertical falla por cobertura de un trazo", () => {
		const result = scoreTrace(T_CORTA, [T_CORTA.strokes[0] as TraceStroke]);
		expect(result.correct).toBe(false);
		expect(result.coverage[1]).toBeLessThan(MIN_COVERAGE);
	});

	it("G4: un garabato sobre L falla por precisión", () => {
		const garabato: TraceStroke[] = [];
		for (let i = 0; i <= 10; i += 1) {
			garabato.push([
				{ x: -0.1, y: i / 10 },
				{ x: 0.7, y: i / 10 },
			]);
		}
		const result = scoreTrace(L, garabato);
		expect(result.correct).toBe(false);
		expect(result.precision).toBeLessThan(0.8);
	});

	it("G5: dedo rápido (solo los 2 extremos de cada trazo) puntúa por distancia al segmento", () => {
		const rapido: TraceStroke[] = L.strokes.map((stroke) => {
			const start = stroke[0];
			const end = stroke[stroke.length - 1];
			if (start === undefined || end === undefined) throw new Error("fixture");
			return [start, end];
		});
		const result = scoreTrace(L, rapido);
		expect(result.correct).toBe(true);
	});

	it("G6: sin tinta ([] y [[]]) da correct false, precision 0 y coverage en 0", () => {
		expect(scoreTrace(L, [])).toEqual({
			correct: false,
			coverage: [0, 0],
			precision: 0,
		});
		expect(scoreTrace(L, [[]])).toEqual({
			correct: false,
			coverage: [0, 0],
			precision: 0,
		});
	});

	it("G7: trazos en orden inverso y cada uno al revés sigue siendo correcto (D12)", () => {
		const invertido: TraceStroke[] = [...L.strokes]
			.reverse()
			.map((stroke) => [...stroke].reverse());
		const result = scoreTrace(L, invertido);
		expect(result.correct).toBe(true);
	});

	it("G8: tinta desplazada +0.3 en x queda fuera de tolerancia", () => {
		const result = scoreTrace(L, shiftX(L.strokes, 0.3));
		expect(result.correct).toBe(false);
	});

	it("G9: tinta desplazada +0.1 en x sigue dentro de tolerancia", () => {
		const result = scoreTrace(L, shiftX(L.strokes, 0.1));
		expect(result.correct).toBe(true);
	});

	it("G10: un solo toque en (0, 0.5) no lanza y da correct false", () => {
		expect(() => scoreTrace(L, [[{ x: 0, y: 0.5 }]])).not.toThrow();
		const result = scoreTrace(L, [[{ x: 0, y: 0.5 }]]);
		expect(result.correct).toBe(false);
	});

	it("G11: L dibujada de un solo trazo continuo también es correcta (el número de trazos no cuenta)", () => {
		const unTrazo: TraceStroke[] = [
			[
				{ x: 0, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0.6, y: 1 },
			],
		];
		const result = scoreTrace(L, unTrazo);
		expect(result.correct).toBe(true);
	});

	it("G12: puntos no finitos se descartan y no cambian el resultado frente a G1", () => {
		const base = scoreTrace(L, L.strokes);
		const conRuido: TraceStroke[] = [
			[
				L.strokes[0]?.[0] as GlyphPoint,
				{ x: Number.POSITIVE_INFINITY, y: 1 },
				L.strokes[0]?.[1] as GlyphPoint,
			],
			L.strokes[1] as TraceStroke,
			[{ x: Number.NaN, y: 0 }],
		];
		const result = scoreTrace(L, conRuido);
		expect(result).toEqual(base);
	});
});

describe("guideLevel", () => {
	const table: Array<[Box, 0 | 1 | 2 | 3, 1 | 2 | 3]> = [
		[0, 0, 1],
		[0, 1, 1],
		[0, 2, 1],
		[0, 3, 1],
		[1, 0, 2],
		[1, 1, 1],
		[1, 2, 1],
		[1, 3, 1],
		[2, 0, 3],
		[2, 1, 2],
		[2, 2, 2],
		[2, 3, 1],
		[3, 0, 3],
		[3, 1, 2],
		[3, 2, 2],
		[3, 3, 1],
	];

	it("G13: tabla completa caja 0-3 x pistas 0-3", () => {
		for (const [box, hintsShown, expected] of table) {
			expect(guideLevel(box, hintsShown)).toBe(expected);
		}
	});
});
