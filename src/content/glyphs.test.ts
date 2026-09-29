import { describe, expect, it } from "vitest";
import {
	glyphFor,
	LOWER_CONFUSABLE_PAIRS,
	LOWER_GLYPHS,
	UPPER_GLYPHS,
} from "@/content/glyphs";
import { curriculum } from "@/content/index";
import type { Item } from "@/content/types";
import {
	isNegligibleTrace,
	scoreTrace,
	TOLERANCE,
	type TraceStroke,
} from "@/engine/trace";
import { withTremor } from "@/engine/trace-test-fixtures";

const LETTERS = ["a", "e", "i", "o", "u", "m", "l", "s", "p"] as const;

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

	it("G16: devuelve el trazo de a en minúscula (D28)", () => {
		const letterA = curriculum.items.get("letter:a");
		if (letterA === undefined)
			throw new Error("falta letter:a en el currículo");
		expect(glyphFor(letterA, "lower")).toEqual(LOWER_GLYPHS.a);
	});

	it("G16: lanza si la minúscula no tiene trazo de referencia", () => {
		const letterSinTrazo: Item = {
			id: "letter:z",
			kind: "letter",
			text: "z",
			phonemes: ["z"],
			audioKey: "phoneme:z",
			display: { upper: "Z", lower: "z" },
		};
		expect(() => glyphFor(letterSinTrazo, "lower")).toThrow();
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

describe("LOWER_GLYPHS (D28)", () => {
	it("L1: las 9 minúsculas existen, ocupan su caja entera y sus puntos caen dentro de ella", () => {
		for (const letter of LETTERS) {
			const item = curriculum.items.get(`letter:${letter}`);
			if (item === undefined) throw new Error(`falta letter:${letter}`);
			const glyph = glyphFor(item, "lower");
			expect([letter, glyph]).toEqual([letter, LOWER_GLYPHS[letter]]);

			const points = glyph.strokes.flat();
			for (const p of points) {
				expect([letter, p.x >= 0 && p.x <= glyph.width]).toEqual([
					letter,
					true,
				]);
				expect([letter, p.y >= 0 && p.y <= 1]).toEqual([letter, true]);
			}
			const minY = Math.min(...points.map((p) => p.y));
			const maxY = Math.max(...points.map((p) => p.y));
			expect([letter, minY <= 0.02]).toEqual([letter, true]);
			expect([letter, maxY >= 0.98]).toEqual([letter, true]);
		}

		// El punto y el palo de la "i" no se tocan dentro del halo de TOLERANCE (S24).
		const glyphI = LOWER_GLYPHS.i;
		if (glyphI === undefined) throw new Error("falta LOWER_GLYPHS.i");
		const [stem, dot] = glyphI.strokes;
		if (stem === undefined || dot === undefined)
			throw new Error("la i necesita dos trazos: palo y punto");
		let minDistance = Number.POSITIVE_INFINITY;
		for (const p of dot) {
			for (const q of stem) {
				const d = Math.hypot(p.x - q.x, p.y - q.y);
				if (d < minDistance) minDistance = d;
			}
		}
		expect(minDistance).toBeGreaterThan(TOLERANCE);
	});

	it("L2: cada minúscula puntúa correcta con sus propios trazos, con y sin temblor", () => {
		for (const letter of LETTERS) {
			const glyph = LOWER_GLYPHS[letter];
			if (glyph === undefined) throw new Error(`falta LOWER_GLYPHS.${letter}`);
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

	it("L3: ninguna minúscula se confunde con otra, salvo los pares medidos (y esos sí pasan)", () => {
		const confusablePairs = new Set(
			LOWER_CONFUSABLE_PAIRS.map(([from, to]) => `${from}>${to}`),
		);
		const unexpected: string[] = [];
		const notActuallyConfusable: string[] = [];
		for (const from of LETTERS) {
			for (const to of LETTERS) {
				if (from === to) continue;
				const pairKey = `${from}>${to}`;
				const fromGlyph = LOWER_GLYPHS[from];
				const toGlyph = LOWER_GLYPHS[to];
				if (fromGlyph === undefined || toGlyph === undefined) continue;
				const result = scoreTrace(toGlyph, fromGlyph.strokes);
				if (confusablePairs.has(pairKey)) {
					// La lista dice "medido": una entrada que ya no pasa (letra retocada,
					// constantes cambiadas) debe fallar el test, no quedarse obsoleta.
					if (!result.correct) notActuallyConfusable.push(pairKey);
					continue;
				}
				if (result.correct) unexpected.push(pairKey);
			}
		}
		expect(unexpected).toEqual([]);
		expect(notActuallyConfusable).toEqual([]);
	});

	it("L4: el punto de la i solo (sin el palo): despreciable si es un toque, no si se dibuja de verdad", () => {
		const glyphI = LOWER_GLYPHS.i;
		if (glyphI === undefined) throw new Error("falta LOWER_GLYPHS.i");
		const [stem, dot] = glyphI.strokes;
		if (stem === undefined || dot === undefined)
			throw new Error("faltan los trazos de la i");

		// Un toque sin querer (D19): un único punto en la zona del punto de la "i", sin
		// arrastre. Longitud de tinta 0 < ACCIDENTAL_INK_RATIO(0.1) × 0.8 (palo 0.7 + punto
		// 0.1 de referencia): sí es despreciable, como cualquier toque. No gasta el intento.
		const toque: TraceStroke = [{ x: 0.1, y: 0.05 }];
		expect(isNegligibleTrace(glyphI, [toque])).toBe(true);

		// Dibujar el punto de verdad (el trazo propio del punto, sin temblor: 0.1 de largo)
		// SÍ supera el umbral (0.08), por poco: no es despreciable, aunque el palo se quede
		// sin dibujar. Documentado (S24/D28): gasta el intento, pero no puntúa correcto,
		// porque el palo (a 0.2 del punto, más que TOLERANCE) se queda sin cobertura.
		expect(isNegligibleTrace(glyphI, [dot])).toBe(false);
		expect(scoreTrace(glyphI, [dot]).correct).toBe(false);

		// El palo solo (sin el punto) tampoco puntúa correcto: la cobertura del trazo del
		// punto es 0 (su muestra más cercana al palo está a 0.2, más que TOLERANCE).
		const soloElPalo = scoreTrace(glyphI, [stem]);
		expect(soloElPalo.correct).toBe(false);
		expect(soloElPalo.coverage[1]).toBe(0);

		// Pero el palo completo más un simple toque de confirmación sobre el punto sí
		// puntúa correcto: ese toque cubre el trazo del punto sin necesidad de dibujarlo.
		expect(scoreTrace(glyphI, [stem, toque]).correct).toBe(true);
	});
});
