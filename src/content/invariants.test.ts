import { describe, expect, it } from "vitest";
import { buildCurriculum, curriculum } from "@/content/index";
import {
	accentIsFinalOnly,
	areMirrorConfusable,
	hasAdjacentVowels,
	hasOnlyOpenSyllables,
	itemsWithoutTemplate,
	stripDiacritics,
	syllabify,
} from "@/content/invariants";

describe("stripDiacritics", () => {
	it("quita la tilde sin tocar la ñ", () => {
		expect(stripDiacritics("mamá")).toBe("mama");
		expect(stripDiacritics("uña")).toBe("uña");
	});
});

describe("syllabify", () => {
	it("parte palabras CV-CV", () => {
		expect(syllabify("mapa")).toEqual(["ma", "pa"]);
		expect(syllabify("mamá")).toEqual(["ma", "má"]);
	});

	it("reconoce una vocal suelta como sílaba", () => {
		expect(syllabify("ala")).toEqual(["a", "la"]);
		expect(syllabify("oso")).toEqual(["o", "so"]);
	});

	it("devuelve vacío si la palabra no es solo CV o V", () => {
		expect(syllabify("pan")).toEqual([]);
		expect(syllabify("plato")).toEqual([]);
	});

	it("reconoce la u, que ninguna otra palabra de prueba ejercita", () => {
		expect(syllabify("luna")).toEqual(["lu", "na"]);
		expect(syllabify("uso")).toEqual(["u", "so"]);
	});
});

describe("hasOnlyOpenSyllables", () => {
	it("acepta CV y V, rechaza CVC y CCV", () => {
		expect(hasOnlyOpenSyllables("mapa")).toBe(true);
		expect(hasOnlyOpenSyllables("ala")).toBe(true);
		expect(hasOnlyOpenSyllables("pan")).toBe(false);
		expect(hasOnlyOpenSyllables("plato")).toBe(false);
	});
});

describe("hasAdjacentVowels", () => {
	it("detecta hiatos y diptongos", () => {
		expect(hasAdjacentVowels("mío")).toBe(true);
		expect(hasAdjacentVowels("tiene")).toBe(true);
		expect(hasAdjacentVowels("mapa")).toBe(false);
	});
});

describe("accentIsFinalOnly", () => {
	it("acepta la tilde en la última sílaba", () => {
		expect(accentIsFinalOnly("mamá")).toBe(true);
		expect(accentIsFinalOnly("papá")).toBe(true);
	});

	it("rechaza la tilde en cualquier otra posición", () => {
		expect(accentIsFinalOnly("árbol")).toBe(false);
		expect(accentIsFinalOnly("página")).toBe(false);
	});

	it("acepta una palabra sin tilde", () => {
		expect(accentIsFinalOnly("mapa")).toBe(true);
	});

	it("acepta la tilde cuando la última sílaba es solo la vocal acentuada", () => {
		expect(accentIsFinalOnly("leí")).toBe(true);
		expect(accentIsFinalOnly("oí")).toBe(true);
	});
});

describe("areMirrorConfusable", () => {
	it("agrupa las seis parejas de b, d, p y q en los dos sentidos", () => {
		const grupo = ["b", "d", "p", "q"];
		for (const a of grupo) {
			for (const b of grupo) {
				expect([a, b, areMirrorConfusable(a, b)]).toEqual([a, b, a !== b]);
			}
		}
	});

	it("no agrupa letras de formas distintas", () => {
		expect(areMirrorConfusable("m", "a")).toBe(false);
		expect(areMirrorConfusable("b", "b")).toBe(false);
	});
});

describe("itemsWithoutTemplate", () => {
	it("T1.1: toda unidad del currículo real tiene plantilla para cada ítem que introduce", () => {
		expect(itemsWithoutTemplate(curriculum)).toEqual([]);
	});

	it("T1.2: detecta una unidad que introduce un ítem que ninguna de sus plantillas acepta", () => {
		const contenido = buildCurriculum({
			items: [
				{
					id: "oral:clap:sol",
					kind: "oral-skill",
					text: "sol",
					phonemes: [],
					audioKey: "word:sol",
					task: { answer: "1" },
				},
			],
			units: [
				{
					id: "solo-listen-tap",
					phase: 0,
					title: "Solo listen-tap",
					audioKey: "unit:solo-listen-tap",
					requires: [],
					introduces: ["oral:clap:sol"],
					exercises: [{ templateId: "listen-tap", weight: 1 }],
				},
			],
		});
		expect(itemsWithoutTemplate(contenido)).toEqual([
			{
				unitId: "solo-listen-tap",
				itemId: "oral:clap:sol",
				kind: "oral-skill",
			},
		]);
	});
});
