import { describe, expect, it } from "vitest";
import { COSMETICS, REWARDS } from "@/engine";
import { hasVisual } from "@/features/rewards/visuals";

describe("visuals", () => {
	it("F1: hay una entrada para cada COSMETICS[].id y cada REWARDS[].id", () => {
		for (const cosmetic of COSMETICS) {
			expect(hasVisual(cosmetic.id), cosmetic.id).toBe(true);
		}
		for (const reward of REWARDS) {
			expect(hasVisual(reward.id), reward.id).toBe(true);
		}
	});

	it("no confunde ids desconocidos ni propiedades heredadas con una entrada real", () => {
		expect(hasVisual("id-inventado")).toBe(false);
		expect(hasVisual("toString")).toBe(false);
		expect(hasVisual("constructor")).toBe(false);
	});
});
