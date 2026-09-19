import { describe, expect, it } from "vitest";
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

	it("el primer fonema coincide con la primera letra del texto salvo en dígrafos", () => {
		const gato = pictures.find((p) => p.id === pictureId("gato"));
		expect(gato?.phonemes[0]).toBe("g");
	});

	it("pictureId construye el id esperado", () => {
		expect(pictureId("oso")).toBe("picture:oso");
	});

	it("incluye las imágenes que comparten las fases 0 y 1", () => {
		for (const word of ["oso", "avión", "uva", "pato", "luna"]) {
			expect(pictures.some((p) => p.id === pictureId(word))).toBe(true);
		}
	});
});
