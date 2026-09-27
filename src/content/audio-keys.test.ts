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

	it("ronda 1, hallazgo 2: la palabra que termina en s también usa la penúltima vocal, con y sin tilde", () => {
		// Sin tilde: la terminación en "s" activa la regla de la penúltima vocal, igual que
		// vocal o "n". Si se quitara esa rama, "lunas" caería al respaldo de la última vocal y
		// daría "as" en vez de "unas".
		expect(rimeOf("lunas")).toBe("unas");
		// Con tilde: la tilde manda primero, aunque la palabra también termine en s.
		expect(rimeOf("compás")).toBe("ás");
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
