import { describe, expect, it } from "vitest";
import {
	accentIsFinalOnly,
	hasAdjacentVowels,
	hasOnlyOpenSyllables,
	stripDiacritics,
	syllabify,
} from "@/content/invariants";
import { phase1Units } from "@/content/phase1";
import {
	CONSONANT_ORDER,
	lettersIntroducedBefore,
	phase2Items,
	phase2Units,
} from "@/content/phase2";
import { itemSchema, unitSchema } from "@/content/types";

const words = phase2Items.filter((i) => i.kind === "word");

describe("Fase 2, estructura", () => {
	it("enseña las consonantes en el orden m, l, s, p", () => {
		expect(CONSONANT_ORDER).toEqual(["m", "l", "s", "p"]);
		expect(phase2Units.map((u) => u.id)).toEqual([
			"phase2:m",
			"phase2:l",
			"phase2:s",
			"phase2:p",
		]);
	});

	it("todo valida contra los esquemas", () => {
		for (const unit of phase2Units)
			expect(unitSchema.safeParse(unit).success).toBe(true);
		for (const item of phase2Items)
			expect(itemSchema.safeParse(item).success).toBe(true);
	});

	it("cada unidad introduce el fonema, la letra y las 5 sílabas de su propia consonante", () => {
		// Contar por prefijo dejaría pasar una permutación: la unidad de la m introduciendo
		// el sonido de la m y la forma de la l. Es el hueco que sobrevivió en la Fase 1.
		CONSONANT_ORDER.forEach((consonant, index) => {
			const introduced = phase2Units[index]?.introduces ?? [];
			expect([consonant, introduced.slice(0, 7)]).toEqual([
				consonant,
				[
					`phoneme:${consonant}`,
					`letter:${consonant}`,
					`syllable:${consonant}a`,
					`syllable:${consonant}e`,
					`syllable:${consonant}i`,
					`syllable:${consonant}o`,
					`syllable:${consonant}u`,
				],
			]);
			expect([
				consonant,
				introduced.slice(7).every((id) => id.startsWith("word:")),
			]).toEqual([consonant, true]);
			expect([consonant, introduced.slice(7).length >= 5]).toEqual([
				consonant,
				true,
			]);
		});
	});

	it("cada ítem lo introduce exactamente una unidad, sin huérfanos", () => {
		const introducidos = phase2Units.flatMap((u) => u.introduces);
		expect([...introducidos].sort()).toEqual(
			[...phase2Items.map((i) => i.id)].sort(),
		);
	});

	it("las cuatro unidades son de fase 2 y encadenan una tras otra", () => {
		expect(phase2Units.map((u) => u.phase)).toEqual([2, 2, 2, 2]);
		expect(phase2Units.map((u) => u.requires)).toEqual([
			["phase1:vowel-u"],
			["phase2:m"],
			["phase2:l"],
			["phase2:s"],
		]);
	});

	it("el prerrequisito de la primera consonante apunta a una unidad que existe de verdad", () => {
		const requerida = phase2Units[0]?.requires[0];
		expect(phase1Units.some((unit) => unit.id === requerida)).toBe(true);
	});

	it("cada unidad declara sus seis plantillas con sus pesos (initial-sound es la única que acepta phoneme)", () => {
		for (const unit of phase2Units) {
			expect([unit.id, unit.exercises]).toEqual([
				unit.id,
				[
					{ templateId: "listen-tap", weight: 3 },
					{ templateId: "build", weight: 2 },
					{ templateId: "trace", weight: 1 },
					{ templateId: "say-it", weight: 3 },
					{ templateId: "read-word", weight: 2 },
					{ templateId: "initial-sound", weight: 1 },
				],
			]);
		}
	});

	it("cada unidad tiene su propio audio de introducción", () => {
		const claves = phase2Units.map((u) => u.audioKey);
		expect(new Set(claves).size).toBe(claves.length);
		CONSONANT_ORDER.forEach((consonant, index) => {
			expect([consonant, phase2Units[index]?.audioKey]).toEqual([
				consonant,
				`unit:phase2:${consonant}`,
			]);
		});
	});
});

describe("Fase 2, invariante 1: pertenencia de letras", () => {
	it("cada palabra usa solo letras ya introducidas en su unidad o antes", () => {
		for (const unit of phase2Units) {
			const allowed = lettersIntroducedBefore(unit.id);
			for (const id of unit.introduces.filter((x) => x.startsWith("word:"))) {
				const word = phase2Items.find((i) => i.id === id);
				expect(word).toBeDefined();
				for (const letter of stripDiacritics(word?.text ?? "")) {
					expect(allowed.has(letter)).toBe(true);
				}
			}
		}
	});
});

describe("Fase 2, invariante 2: sílabas abiertas", () => {
	it("toda palabra se descompone solo en CV o V", () => {
		for (const word of words)
			expect(hasOnlyOpenSyllables(word.text)).toBe(true);
	});

	it("las sílabas declaradas coinciden con la silabificación", () => {
		for (const word of words)
			expect(word.syllables).toEqual(syllabify(word.text));
	});

	it("rechazaría una palabra con coda o grupo consonántico", () => {
		expect(hasOnlyOpenSyllables("pan")).toBe(false);
		expect(hasOnlyOpenSyllables("plato")).toBe(false);
	});
});

describe("Fase 2, invariante 3: sin vocales adyacentes", () => {
	it("ninguna palabra tiene dos vocales seguidas", () => {
		for (const word of words) expect(hasAdjacentVowels(word.text)).toBe(false);
	});

	it("rechazaría mío y tiene", () => {
		expect(hasAdjacentVowels("mío")).toBe(true);
		expect(hasAdjacentVowels("tiene")).toBe(true);
	});
});

describe("Fase 2, invariante 4: tildes", () => {
	it("solo mamá y papá llevan tilde, y van marcadas", () => {
		const conTilde = words.filter((w) => w.text !== stripDiacritics(w.text));
		expect(conTilde.map((w) => w.text).sort()).toEqual(["mamá", "papá"]);
		for (const word of conTilde) expect(word.accented).toBe(true);
	});

	it("la tilde cae en la última sílaba", () => {
		for (const word of words) expect(accentIsFinalOnly(word.text)).toBe(true);
	});

	it("ninguna palabra sin tilde queda marcada como acentuada", () => {
		for (const word of words.filter(
			(w) => w.text === stripDiacritics(w.text),
		)) {
			expect(word.accented).toBeUndefined();
		}
	});
});

describe("Fase 2, sílabas", () => {
	it("las cuatro consonantes generan sus 5 sílabas con las vocales en orden a, e, i, o, u", () => {
		// Comprobar solo la m dejaría pasar un error en las otras tres.
		for (const consonant of CONSONANT_ORDER) {
			const silabas = phase2Items.filter(
				(i) => i.kind === "syllable" && i.text.startsWith(consonant),
			);
			expect([consonant, silabas.map((i) => i.text)]).toEqual([
				consonant,
				["a", "e", "i", "o", "u"].map((v) => `${consonant}${v}`),
			]);
		}
	});

	it("cada sílaba declara sus dos fonemas y su audio propio", () => {
		for (const item of phase2Items.filter((i) => i.kind === "syllable")) {
			expect([item.id, item.phonemes]).toEqual([
				item.id,
				[item.text[0], item.text[1]],
			]);
			expect([item.id, item.audioKey]).toEqual([
				item.id,
				`syllable:${item.text}`,
			]);
		}
	});

	it("cada letra de consonante trae su par mayúscula y minúscula y suena, no se nombra", () => {
		for (const consonant of CONSONANT_ORDER) {
			const letra = phase2Items.find((i) => i.id === `letter:${consonant}`);
			expect([consonant, letra?.display?.upper, letra?.display?.lower]).toEqual(
				[consonant, consonant.toUpperCase(), consonant],
			);
			expect([consonant, letra?.audioKey]).toEqual([
				consonant,
				`phoneme:${consonant}`,
			]);
		}
	});
});

describe("Fase 2, contratos de funciones críticas", () => {
	it("lettersIntroducedBefore declara exactamente las letras disponibles en cada unidad", () => {
		// El test del invariante 1 usa esta función como oráculo: si estuviera mal, ese test
		// se volvería vacuo. Aquí se fija su contrato contra conjuntos escritos a mano.
		const vocales = ["a", "e", "i", "o", "u"];
		expect([...lettersIntroducedBefore("phase2:m")].sort()).toEqual(
			[...vocales, "m"].sort(),
		);
		expect([...lettersIntroducedBefore("phase2:l")].sort()).toEqual(
			[...vocales, "l", "m"].sort(),
		);
		expect([...lettersIntroducedBefore("phase2:s")].sort()).toEqual(
			[...vocales, "l", "m", "s"].sort(),
		);
		expect([...lettersIntroducedBefore("phase2:p")].sort()).toEqual(
			[...vocales, "l", "m", "p", "s"].sort(),
		);
	});

	it("el inventario de palabras de cada unidad está fijado", () => {
		const palabrasDe = (unitId: string) =>
			(phase2Units.find((u) => u.id === unitId)?.introduces ?? [])
				.filter((id) => id.startsWith("word:"))
				.map((id) => id.slice("word:".length));
		expect(palabrasDe("phase2:m")).toEqual([
			"mama",
			"mimo",
			"mima",
			"ama",
			"amo",
		]);
		expect(palabrasDe("phase2:l")).toEqual([
			"lima",
			"loma",
			"mula",
			"mala",
			"malo",
			"lelo",
			"ala",
			"ola",
		]);
		expect(palabrasDe("phase2:s")).toEqual([
			"mesa",
			"masa",
			"misa",
			"suma",
			"sumo",
			"sola",
			"sala",
			"oso",
			"uso",
			"eso",
			"asa",
		]);
		expect(palabrasDe("phase2:p")).toEqual([
			"papa",
			"pipa",
			"mapa",
			"sapo",
			"sopa",
			"pesa",
			"puma",
			"pala",
			"pelo",
			"polo",
			"lupa",
			"paso",
			"piso",
		]);
		expect(words).toHaveLength(37);
	});

	it("las 37 palabras son distintas y ninguna se repite entre unidades", () => {
		const textos = words.map((w) => w.text);
		expect(new Set(textos).size).toBe(textos.length);
		const ids = phase2Units
			.flatMap((u) => u.introduces)
			.filter((id) => id.startsWith("word:"));
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("los fonemas de cada palabra son sus letras sin tilde", () => {
		for (const word of words) {
			expect([word.text, word.phonemes]).toEqual([
				word.text,
				[...stripDiacritics(word.text)],
			]);
		}
	});

	it("cada palabra apunta a la imagen y al audio de su propio id", () => {
		for (const word of words) {
			const base = stripDiacritics(word.text);
			expect([word.text, word.audioKey]).toEqual([word.text, `word:${base}`]);
			expect([word.text, word.imageKey]).toEqual([word.text, `img:${base}`]);
		}
	});
});
