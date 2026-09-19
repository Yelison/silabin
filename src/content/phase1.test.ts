import { describe, expect, it } from "vitest";
import { phase0Units } from "@/content/phase0";
import { phase1Items, phase1Units, VOWEL_ORDER } from "@/content/phase1";
import { picturesByInitialPhoneme } from "@/content/pictures";
import { itemSchema, unitSchema } from "@/content/types";

describe("Fase 1", () => {
	it("enseña las vocales en el orden a, e, o, i, u", () => {
		expect(VOWEL_ORDER).toEqual(["a", "e", "o", "i", "u"]);
		expect(phase1Units.map((u) => u.id)).toEqual([
			"phase1:vowel-a",
			"phase1:vowel-e",
			"phase1:vowel-o",
			"phase1:vowel-i",
			"phase1:vowel-u",
		]);
	});

	it("todo valida contra los esquemas", () => {
		for (const unit of phase1Units)
			expect(unitSchema.safeParse(unit).success).toBe(true);
		for (const item of phase1Items)
			expect(itemSchema.safeParse(item).success).toBe(true);
	});

	it("cada unidad introduce el fonema y la letra de su propia vocal", () => {
		// Comprobar solo los prefijos dejaba pasar una permutación: la unidad de la a
		// enseñando el sonido de la a y la forma de la e.
		VOWEL_ORDER.forEach((vowel, index) => {
			expect([vowel, phase1Units[index]?.introduces]).toEqual([
				vowel,
				[`phoneme:${vowel}`, `letter:${vowel}`],
			]);
		});
	});

	it("cada letra trae su par mayúscula y minúscula", () => {
		for (const item of phase1Items.filter((i) => i.kind === "letter")) {
			expect(item.display?.upper).toBe(item.text.toUpperCase());
			expect(item.display?.lower).toBe(item.text);
		}
	});

	it("la primera vocal depende de haber terminado la Fase 0 y las demás encadenan", () => {
		// Se comprueba la cadena COMPLETA, no tres eslabones sueltos: en la Fase 0 una
		// comprobación parcial dejó pasar una unidad con los prerrequisitos rotos.
		expect(phase1Units.map((u) => u.requires)).toEqual([
			["phase0:hear-it"],
			["phase1:vowel-a"],
			["phase1:vowel-e"],
			["phase1:vowel-o"],
			["phase1:vowel-i"],
		]);
		expect(phase1Units.map((u) => u.phase)).toEqual([1, 1, 1, 1, 1]);
	});

	it("el prerrequisito de la primera vocal apunta a una unidad que existe de verdad", () => {
		const requerida = phase1Units[0]?.requires[0];
		expect(phase0Units.some((unit) => unit.id === requerida)).toBe(true);
	});

	it("cada ítem lo introduce exactamente una unidad, sin huérfanos", () => {
		const introducidos = phase1Units.flatMap((u) => u.introduces);
		expect([...introducidos].sort()).toEqual(
			[...phase1Items.map((i) => i.id)].sort(),
		);
		expect(phase1Items).toHaveLength(10);
	});

	it("cada unidad declara las cuatro plantillas con sus pesos", () => {
		for (const unit of phase1Units) {
			expect([unit.id, unit.exercises]).toEqual([
				unit.id,
				[
					{ templateId: "initial-sound", weight: 1 },
					{ templateId: "listen-tap", weight: 3 },
					{ templateId: "trace", weight: 2 },
					{ templateId: "say-it", weight: 2 },
				],
			]);
		}
	});

	it("cada vocal tiene al menos 3 imágenes de ejemplo derivadas del catálogo", () => {
		for (const vowel of VOWEL_ORDER) {
			expect(picturesByInitialPhoneme(vowel).length).toBeGreaterThanOrEqual(3);
		}
	});

	it("picturesByInitialPhoneme solo devuelve imágenes que empiezan por ese sonido", () => {
		// Comprobar solo la cantidad dejaría pasar un filtro que devuelve las imágenes
		// equivocadas, y entonces el ejercicio de sonido inicial enseñaría lo contrario.
		for (const vowel of VOWEL_ORDER) {
			for (const picture of picturesByInitialPhoneme(vowel)) {
				expect([vowel, picture.text, picture.phonemes[0]]).toEqual([
					vowel,
					picture.text,
					vowel,
				]);
			}
		}
	});

	it("el sonido de cada vocal es la propia vocal y su letra usa ese mismo audio", () => {
		for (const vowel of VOWEL_ORDER) {
			const phoneme = phase1Items.find((i) => i.id === `phoneme:${vowel}`);
			const letter = phase1Items.find((i) => i.id === `letter:${vowel}`);
			expect([vowel, phoneme?.phonemes]).toEqual([vowel, [vowel]]);
			expect([vowel, letter?.audioKey]).toEqual([vowel, `phoneme:${vowel}`]);
		}
	});

	it("cada unidad tiene su propio audio de introducción", () => {
		const claves = phase1Units.map((unit) => unit.audioKey);
		expect(new Set(claves).size).toBe(claves.length);
		VOWEL_ORDER.forEach((vowel, index) => {
			expect([vowel, phase1Units[index]?.audioKey]).toEqual([
				vowel,
				`unit:phase1:vowel-${vowel}`,
			]);
		});
	});
});
