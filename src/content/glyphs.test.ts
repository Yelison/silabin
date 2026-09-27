import { describe, expect, it } from "vitest";
import { type GlyphPoint, glyphFor, UPPER_GLYPHS } from "@/content/glyphs";
import { curriculum } from "@/content/index";
import type { Item } from "@/content/types";
import { SAMPLE_STEP, scoreTrace, type TraceStroke } from "@/engine/trace";

const LETTERS = ["a", "e", "i", "o", "u", "m", "l", "s", "p"] as const;

/** Reimplementación del remuestreo, solo para construir tinta de prueba (detalle interno
 * de trace.ts, no exportado). */
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

describe("scoreTrace con las 9 letras reales", () => {
	it("G14: cada letra puntúa correcta con sus propios trazos, con y sin temblor", () => {
		for (const letter of LETTERS) {
			const glyph = UPPER_GLYPHS[letter];
			if (glyph === undefined) throw new Error(`falta UPPER_GLYPHS.${letter}`);
			expect([letter, scoreTrace(glyph, glyph.strokes).correct]).toEqual([
				letter,
				true,
			]);
			expect([
				letter,
				scoreTrace(glyph, withTremor(glyph.strokes)).correct,
			]).toEqual([letter, true]);
		}
	});

	it("G15: ninguna letra se confunde con otra, salvo los pares conocidos", () => {
		const CONFUSABLE_PAIRS = new Set(["e>s", "e>p", "s>e", "o>u", "u>o"]);
		const unexpected: string[] = [];
		for (const from of LETTERS) {
			for (const to of LETTERS) {
				if (from === to) continue;
				const pairKey = `${from}>${to}`;
				const fromGlyph = UPPER_GLYPHS[from];
				const toGlyph = UPPER_GLYPHS[to];
				if (fromGlyph === undefined || toGlyph === undefined) continue;
				const result = scoreTrace(toGlyph, fromGlyph.strokes);
				if (CONFUSABLE_PAIRS.has(pairKey)) continue;
				if (result.correct) unexpected.push(pairKey);
			}
		}
		expect(unexpected).toEqual([]);
	});
});

describe("glyphFor", () => {
	it("G16: devuelve el trazo de A en mayúscula", () => {
		const letterA = curriculum.items.get("letter:a");
		if (letterA === undefined)
			throw new Error("falta letter:a en el currículo");
		expect(glyphFor(letterA, "upper")).toEqual(UPPER_GLYPHS.a);
	});

	it("G16: lanza si se pide la minúscula", () => {
		const letterA = curriculum.items.get("letter:a");
		if (letterA === undefined)
			throw new Error("falta letter:a en el currículo");
		expect(() => glyphFor(letterA, "lower")).toThrow();
	});

	it("G16: lanza si el ítem no es una letra", () => {
		const phonemeA = curriculum.items.get("phoneme:a");
		if (phonemeA === undefined)
			throw new Error("falta phoneme:a en el currículo");
		expect(() => glyphFor(phonemeA, "upper")).toThrow();
	});

	it("G16: lanza si la letra no tiene trazo de referencia", () => {
		const letterSinTrazo: Item = {
			id: "letter:z",
			kind: "letter",
			text: "z",
			phonemes: ["z"],
			audioKey: "phoneme:z",
			display: { upper: "Z", lower: "z" },
		};
		expect(() => glyphFor(letterSinTrazo, "upper")).toThrow();
	});
});
