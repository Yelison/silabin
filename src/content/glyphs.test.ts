import { describe, expect, it } from "vitest";
import { glyphFor, UPPER_GLYPHS } from "@/content/glyphs";
import { curriculum } from "@/content/index";
import type { Item } from "@/content/types";
import { scoreTrace } from "@/engine/trace";
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
