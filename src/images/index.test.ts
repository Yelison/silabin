import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { curriculum } from "@/content";
import { imageFor, slugFor } from "@/images";

function imageKeys(): Set<string> {
	const keys = new Set<string>();
	for (const item of curriculum.items.values()) {
		if (item.imageKey !== undefined) keys.add(item.imageKey);
	}
	return keys;
}

describe("imageFor", () => {
	it("I1: todo imageKey del currículo tiene src, emoji no vacío y alt con la palabra", () => {
		const keys = imageKeys();
		expect(keys.size).toBeGreaterThanOrEqual(35);
		for (const key of keys) {
			const image = imageFor(key);
			const palabra = key.slice("img:".length);
			expect(image, key).not.toBeNull();
			expect(image?.emoji.length, key).toBeGreaterThan(0);
			expect(image?.alt, key).toBe(palabra);
			expect(image?.src, key).toBe(`/images/palabras/${slugFor(palabra)}.webp`);
		}
	});

	it("I3: el fichero de cada imagen existe en public/ y pesa menos de 60 KB", () => {
		for (const key of imageKeys()) {
			const src = imageFor(key)?.src ?? "";
			expect(src, key).toMatch(/^\/images\/palabras\/[a-z]+\.webp$/);
			const ruta = join(process.cwd(), "public", src);
			expect(existsSync(ruta), ruta).toBe(true);
			expect(statSync(ruta).size, ruta).toBeLessThan(60 * 1024);
		}
	});

	it("I4: slugFor da solo [a-z]+ y no hay dos palabras con el mismo slug", () => {
		const slugs = new Map<string, string>();
		for (const key of imageKeys()) {
			const palabra = key.slice("img:".length);
			const slug = slugFor(palabra);
			expect(slug, palabra).toMatch(/^[a-z]+$/);
			expect(slugs.get(slug), `${palabra} choca con ${slugs.get(slug)}`).toBe(
				undefined,
			);
			slugs.set(slug, palabra);
		}
	});

	it("I5: slugFor quita tildes y cambia la ñ", () => {
		expect(slugFor("ratón")).toBe("raton");
		expect(slugFor("uña")).toBe("una");
		expect(slugFor("árbol")).toBe("arbol");
	});

	it("I2: una clave desconocida devuelve null", () => {
		expect(imageFor("img:nada")).toBeNull();
		expect(imageFor("")).toBeNull();
	});

	it("no confunde propiedades heredadas del objeto con claves", () => {
		expect(imageFor("toString")).toBeNull();
		expect(imageFor("img:constructor")).toBeNull();
	});
});
