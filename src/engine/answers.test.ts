import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import {
	expectedAnswer,
	expectedPieces,
	firstSyllableAudioKey,
	reducedPieces,
} from "@/engine/answers";
import { checkAnswer } from "@/engine/session";
import type { PlannedExercise } from "@/engine/types";

function exercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
	return {
		id: "ex-1",
		kind: "evaluation",
		templateId: "listen-tap",
		itemId: "letter:m",
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
		...overrides,
	};
}

function item(id: string) {
	const found = curriculum.items.get(id);
	if (found === undefined) throw new Error(`falta ${id} en el currículo`);
	return found;
}

describe("expectedAnswer", () => {
	it("M1: en rhyme, initial-sound y listen-tap devuelve correctOptionId", () => {
		const casos: [PlannedExercise["templateId"], string][] = [
			["rhyme", "oral:rhyme:gato"],
			["initial-sound", "oral:initial:avión"],
			["listen-tap", "letter:m"],
		];
		for (const [templateId, itemId] of casos) {
			const ex = exercise({ templateId, itemId, correctOptionId: "x" });
			expect([itemId, expectedAnswer(ex, item(itemId))]).toEqual([itemId, "x"]);
		}
	});

	it("mata la mutación 1: correctOptionId gana aunque el ítem tenga su propio task.answer", () => {
		const rima = item("oral:rhyme:gato");
		expect(rima.task?.answer).toBeDefined();
		expect(rima.task?.answer).not.toBe("otra-cosa");
		const ex = exercise({
			templateId: "rhyme",
			itemId: rima.id,
			correctOptionId: "otra-cosa",
		});
		expect(expectedAnswer(ex, rima)).toBe("otra-cosa");
	});

	it("M2: hear-it devuelve item.task.answer", () => {
		const hear = item("oral:hear:a-sol");
		const ex = exercise({
			templateId: "hear-it",
			itemId: hear.id,
			correctOptionId: null,
		});
		expect(expectedAnswer(ex, hear)).toBe("no");
	});

	it("M3: build devuelve item.text", () => {
		const ma = item("syllable:ma");
		const ex = exercise({
			templateId: "build",
			itemId: ma.id,
			correctOptionId: null,
		});
		expect(expectedAnswer(ex, ma)).toBe("ma");
	});

	it("M4: trace, say-it y read-word devuelven null", () => {
		const casos: [PlannedExercise["templateId"], string][] = [
			["trace", "letter:a"],
			["say-it", "letter:a"],
			["read-word", "word:mama"],
		];
		for (const [templateId, itemId] of casos) {
			const ex = exercise({ templateId, itemId, correctOptionId: null });
			expect([itemId, expectedAnswer(ex, item(itemId))]).toEqual([
				itemId,
				null,
			]);
		}
	});
});

describe("expectedPieces", () => {
	it("M7: build devuelve las piezas correctas en orden", () => {
		const lo = item("syllable:lo");
		const ex = exercise({
			templateId: "build",
			itemId: lo.id,
			correctOptionId: null,
			optionIds: [
				"letter:l",
				"letter:m",
				"letter:a",
				"letter:e",
				"letter:i",
				"letter:o",
				"letter:u",
			],
		});
		expect(expectedPieces(ex, curriculum, lo)).toEqual([
			"letter:l",
			"letter:o",
		]);
	});

	it("fuera de build devuelve vacío", () => {
		const m = item("letter:m");
		const ex = exercise({ templateId: "listen-tap", itemId: m.id });
		expect(expectedPieces(ex, curriculum, m)).toEqual([]);
	});
});

describe("reducedPieces", () => {
	it("M7: build, rung 1, deja la consonante correcta y las 5 vocales, sin otras consonantes vistas (mata la mutación 5)", () => {
		const lo = item("syllable:lo");
		const ex = exercise({
			templateId: "build",
			itemId: lo.id,
			correctOptionId: null,
			optionIds: [
				"letter:l",
				"letter:m",
				"letter:a",
				"letter:e",
				"letter:i",
				"letter:o",
				"letter:u",
			],
		});
		const piezas = reducedPieces(ex, curriculum, lo);
		expect([...piezas].sort()).toEqual(
			[
				"letter:a",
				"letter:e",
				"letter:i",
				"letter:l",
				"letter:o",
				"letter:u",
			].sort(),
		);
		expect(piezas).not.toContain("letter:m");
	});

	it("fuera de build devuelve vacío", () => {
		const m = item("letter:m");
		const ex = exercise({ templateId: "listen-tap", itemId: m.id });
		expect(reducedPieces(ex, curriculum, m)).toEqual([]);
	});
});

describe("checkAnswer usa expectedAnswer", () => {
	it("M4: trace sigue lanzando cuando no hay respuesta que comparar", () => {
		const a = item("letter:a");
		const ex = exercise({
			templateId: "trace",
			itemId: a.id,
			correctOptionId: null,
		});
		expect(() => checkAnswer(ex, a, "a")).toThrow();
	});

	it("M5: build compara con item.text", () => {
		const ma = item("syllable:ma");
		const ex = exercise({
			templateId: "build",
			itemId: ma.id,
			correctOptionId: null,
		});
		expect(checkAnswer(ex, ma, "ma")).toBe("correct");
		expect(checkAnswer(ex, ma, "am")).toBe("wrong");
	});
});

describe("firstSyllableAudioKey", () => {
	it("M8: la sílaba si existe como ítem, la vocal si la sílaba es una vocal sola", () => {
		expect(firstSyllableAudioKey(curriculum, item("word:mapa"))).toBe(
			item("syllable:ma").audioKey,
		);
		expect(firstSyllableAudioKey(curriculum, item("word:mama"))).toBe(
			item("syllable:ma").audioKey,
		);
		expect(firstSyllableAudioKey(curriculum, item("word:ala"))).toBe(
			item("phoneme:a").audioKey,
		);
	});

	it("M8b: lanza si el ítem no es una palabra", () => {
		expect(() => firstSyllableAudioKey(curriculum, item("letter:a"))).toThrow();
	});
});
