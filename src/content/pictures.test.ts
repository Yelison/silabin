import { describe, expect, it } from "vitest";
import { stripDiacritics } from "@/content/invariants";
import { pictureId, pictures } from "@/content/pictures";
import { itemSchema } from "@/content/types";

describe("catálogo de imágenes", () => {
	it("tiene las 35 imágenes de las fases 0 y 1", () => {
		expect(pictures).toHaveLength(35);
	});

	it("todas validan contra el esquema de ítem", () => {
		for (const picture of pictures)
			expect(itemSchema.safeParse(picture).success).toBe(true);
	});

	it("todas son de clase picture y llevan imageKey", () => {
		for (const picture of pictures) {
			expect(picture.kind).toBe("picture");
			expect(picture.imageKey).toBeDefined();
		}
	});

	it("no hay ids repetidos", () => {
		expect(new Set(pictures.map((p) => p.id)).size).toBe(pictures.length);
	});

	it("el primer fonema de cada imagen corresponde a la ortografía de su palabra", () => {
		/** Sonido inicial que corresponde a la ortografía de la palabra, según las reglas del español. */
		function expectedOnset(word: string): string {
			const first = stripDiacritics(word[0] ?? "");
			const second = stripDiacritics(word[1] ?? "");
			if (first === "c" && ["a", "o", "u"].includes(second)) return "k";
			if (first === "v") return "b";
			return first;
		}

		for (const picture of pictures) {
			expect([picture.text, picture.phonemes[0]]).toEqual([
				picture.text,
				expectedOnset(picture.text),
			]);
		}
	});

	it("pictureId construye el id esperado", () => {
		expect(pictureId("oso")).toBe("picture:oso");
	});

	it("incluye las imágenes que comparten las fases 0 y 1", () => {
		for (const word of ["oso", "avión", "uva", "pato", "luna"]) {
			expect(pictures.some((p) => p.id === pictureId(word))).toBe(true);
		}
	});

	it("audioKey e imageKey siguen su convención y no están intercambiados", () => {
		for (const picture of pictures) {
			expect([picture.text, picture.audioKey]).toEqual([
				picture.text,
				`word:${picture.text}`,
			]);
			expect([picture.text, picture.imageKey]).toEqual([
				picture.text,
				`img:${picture.text}`,
			]);
		}
	});

	it("las sílabas de cada imagen reconstruyen su palabra", () => {
		for (const picture of pictures) {
			expect([picture.text, picture.syllables?.join("")]).toEqual([
				picture.text,
				picture.text,
			]);
			expect((picture.syllables ?? []).length).toBeGreaterThan(0);
		}
	});
});
