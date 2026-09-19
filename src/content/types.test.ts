import { describe, expect, it } from "vitest";
import { itemSchema, unitSchema } from "@/content/types";

const letra = {
	id: "letter:a",
	kind: "letter",
	text: "a",
	phonemes: ["a"],
	audioKey: "letter:a",
	display: { upper: "A", lower: "a" },
};

describe("itemSchema", () => {
	it("acepta una letra con su par mayúscula y minúscula", () => {
		expect(itemSchema.parse(letra).id).toBe("letter:a");
	});

	it("rechaza una letra sin display", () => {
		const { display, ...sinDisplay } = letra;
		expect(itemSchema.safeParse(sinDisplay).success).toBe(false);
	});

	it("rechaza una palabra sin sílabas", () => {
		const palabra = {
			id: "word:mapa",
			kind: "word",
			text: "mapa",
			phonemes: ["m", "a", "p", "a"],
			audioKey: "word:mapa",
		};
		expect(itemSchema.safeParse(palabra).success).toBe(false);
	});

	it("acepta una palabra con sílabas", () => {
		const palabra = {
			id: "word:mapa",
			kind: "word",
			text: "mapa",
			phonemes: ["m", "a", "p", "a"],
			audioKey: "word:mapa",
			syllables: ["ma", "pa"],
		};
		expect(itemSchema.parse(palabra).syllables).toEqual(["ma", "pa"]);
	});

	it("exige phonemes salvo en oral-skill", () => {
		const silaba = {
			id: "syllable:ma",
			kind: "syllable",
			text: "ma",
			phonemes: [],
			audioKey: "syllable:ma",
		};
		expect(itemSchema.safeParse(silaba).success).toBe(false);
	});

	it("acepta una habilidad oral sin phonemes pero con task", () => {
		const oral = {
			id: "oral:clap:mesa",
			kind: "oral-skill",
			text: "mesa",
			phonemes: [],
			audioKey: "word:mesa",
			task: { answer: "2" },
		};
		expect(itemSchema.parse(oral).task?.answer).toBe("2");
	});

	it("rechaza una habilidad oral sin task", () => {
		const oral = {
			id: "oral:clap:mesa",
			kind: "oral-skill",
			text: "mesa",
			phonemes: [],
			audioKey: "word:mesa",
		};
		expect(itemSchema.safeParse(oral).success).toBe(false);
	});
});

describe("unitSchema", () => {
	it("acepta una unidad con prerrequisitos y ejercicios", () => {
		const unidad = {
			id: "phase1:vowel-a",
			phase: 1,
			title: "La vocal a",
			audioKey: "unit:phase1:vowel-a",
			requires: ["phase0:hear-it"],
			introduces: ["phoneme:a", "letter:a"],
			exercises: [{ templateId: "listen-tap", weight: 2 }],
		};
		expect(unitSchema.parse(unidad).introduces).toHaveLength(2);
	});

	it("rechaza una unidad sin ítems que introducir cuando es de fase 0 a 2", () => {
		const unidad = {
			id: "phase1:vacia",
			phase: 1,
			title: "Vacía",
			audioKey: "unit:x",
			requires: [],
			introduces: [],
			exercises: [{ templateId: "listen-tap", weight: 1 }],
		};
		expect(unitSchema.safeParse(unidad).success).toBe(false);
	});

	it("acepta una unidad de fase 3 vacía, que solo marca el camino futuro", () => {
		const unidad = {
			id: "phase3:t",
			phase: 3,
			title: "La t",
			audioKey: "unit:phase3:t",
			requires: [],
			introduces: [],
			exercises: [],
		};
		expect(unitSchema.parse(unidad).phase).toBe(3);
	});

	it("rechaza una unidad jugable sin plantillas declaradas", () => {
		const unidad = {
			id: "phase1:sin-ejercicios",
			phase: 1,
			title: "Sin ejercicios",
			audioKey: "unit:x",
			requires: [],
			introduces: ["phoneme:a"],
			exercises: [],
		};
		expect(unitSchema.safeParse(unidad).success).toBe(false);
	});
});
