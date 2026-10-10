import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { worldName } from "@/content/worlds";

describe("nombres de mundo (MC6)", () => {
	it("MW1: toda fase del currículo tiene un nombre no vacío", () => {
		for (const unit of curriculum.units.values()) {
			expect(() => worldName(unit.phase)).not.toThrow();
			expect(worldName(unit.phase).trim()).not.toBe("");
		}
	});

	it("MW2: los nombres de las fases 0 a 3", () => {
		expect([0, 1, 2, 3].map(worldName)).toEqual([
			"Oído de explorador",
			"Las vocales",
			"Las sílabas",
			"Más letras",
		]);
	});

	it("MW3: una fase sin nombre lanza RangeError", () => {
		expect(() => worldName(99)).toThrow(RangeError);
	});
});
