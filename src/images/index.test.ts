import { describe, expect, it } from "vitest";
import { curriculum } from "@/content";
import { imageFor } from "@/images";

describe("imageFor", () => {
	it("I1: todo imageKey del currículo tiene un emoji no vacío y alt con la palabra", () => {
		const keys = new Set<string>();
		for (const item of curriculum.items.values()) {
			if (item.imageKey !== undefined) keys.add(item.imageKey);
		}
		expect(keys.size).toBeGreaterThanOrEqual(35);
		for (const key of keys) {
			const image = imageFor(key);
			expect(image, key).not.toBeNull();
			expect(image?.emoji.length, key).toBeGreaterThan(0);
			expect(image?.alt, key).toBe(key.slice("img:".length));
		}
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
