import { describe, expect, it } from "vitest";
import { COSMETICS, REWARDS } from "@/engine";
import { cosmeticVisual, hasVisual } from "@/features/rewards/visuals";

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

	it("un cosmético de rastro trae su propio emoji: es el único sitio que lo decide", () => {
		const visual = cosmeticVisual("trail:burbujas");
		expect(visual.slot).toBe("trail");
		if (visual.slot !== "trail") throw new Error("no debería pasar");
		expect(visual.emoji).toBe("🫧");
	});
});
