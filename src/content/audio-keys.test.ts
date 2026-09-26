import { describe, expect, it } from "vitest";
import {
	endingKey,
	picturesStartingWith,
	rimeOf,
	stretchInKey,
	stretchKey,
} from "@/content/audio-keys";
import { stripDiacritics } from "@/content/invariants";

describe("rimeOf", () => {
	it("M8: calcula el final de cada palabra (comparado sin tildes)", () => {
		const ESPERADO: Record<string, string> = {
			gato: "ato",
			pato: "ato",
			ratón: "on",
			limón: "on",
			sol: "ol",
			pan: "an",
			luna: "una",
			cuna: "una",
		};
		for (const [word, esperado] of Object.entries(ESPERADO)) {
			expect([word, stripDiacritics(rimeOf(word))]).toEqual([word, esperado]);
		}
	});

	it("mata la mutación 3: conserva la tilde y empieza justo en la vocal acentuada", () => {
		expect(rimeOf("ratón")).toBe("ón");
		expect(rimeOf("limón")).toBe("ón");
	});
});

describe("endingKey", () => {
	it('convierte "picture:gato" en "ending:gato"', () => {
		expect(endingKey("picture:gato")).toBe("ending:gato");
	});
});

describe("stretchKey", () => {
	it("antepone stretch: al id del ítem tal cual", () => {
		expect(stretchKey("syllable:ma")).toBe("stretch:syllable:ma");
		expect(stretchKey("letter:a")).toBe("stretch:letter:a");
	});
});

describe("stretchInKey", () => {
	it('convierte "oral:hear:a-pato" en "stretch-in:a-pato"', () => {
		expect(stretchInKey("oral:hear:a-pato")).toBe("stretch-in:a-pato");
	});
});

describe("picturesStartingWith", () => {
	it("M13: devuelve n imágenes cuyo primer fonema coincide, en el orden del catálogo", () => {
		const resultado = picturesStartingWith("a", 3);
		expect(resultado).toHaveLength(3);
		for (const picture of resultado) expect(picture.phonemes[0]).toBe("a");
	});
});
