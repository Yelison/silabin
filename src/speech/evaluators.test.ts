import { describe, expect, it } from "vitest";
import { createParentEvaluator, pickEvaluator } from "@/speech/evaluators";
import type { SpeechEvaluator, SpeechTarget } from "@/speech/types";

const target: SpeechTarget = { text: "a", phonemes: ["a"], lang: "es-MX" };

function falso(
	id: SpeechEvaluator["id"],
	disponible: boolean | "lanza",
): SpeechEvaluator {
	return {
		id,
		available: async () => {
			if (disponible === "lanza") throw new Error("boom");
			return disponible;
		},
		evaluate: async () => ({ verdict: "ok", confidence: 1 }),
	};
}

describe("pickEvaluator", () => {
	const parent = createParentEvaluator();

	it('S13: "parent" devuelve el parent aunque haya otro disponible', async () => {
		const r = await pickEvaluator([falso("browser", true), parent], "parent");
		expect(r.id).toBe("parent");
	});

	it('"parent" lanza si no está en la lista', async () => {
		await expect(
			pickEvaluator([falso("browser", true)], "parent"),
		).rejects.toThrow();
	});

	it('S13: "auto" elige el primero disponible', async () => {
		const r = await pickEvaluator([falso("browser", true), parent], "auto");
		expect(r.id).toBe("browser");
	});

	it('S13: "auto" con browser no disponible cae a parent', async () => {
		const r = await pickEvaluator([falso("browser", false), parent], "auto");
		expect(r.id).toBe("parent");
	});

	it("S13: un available() que lanza cuenta como no disponible", async () => {
		const r = await pickEvaluator([falso("browser", "lanza"), parent], "auto");
		expect(r.id).toBe("parent");
	});

	it('"auto" respeta el orden azure, browser, parent sea cual sea el de la lista', async () => {
		const r = await pickEvaluator(
			[parent, falso("browser", true), falso("azure", true)],
			"auto",
		);
		expect(r.id).toBe("azure");
		const r2 = await pickEvaluator(
			[parent, falso("browser", true), falso("azure", false)],
			"auto",
		);
		expect(r2.id).toBe("browser");
	});

	it('"auto" sin ninguno disponible lanza', async () => {
		await expect(
			pickEvaluator([falso("browser", false)], "auto"),
		).rejects.toThrow();
	});
});

describe("createParentEvaluator", () => {
	it("S14: está disponible y evalúa unsure con confianza 0, sin audio", async () => {
		const p = createParentEvaluator();
		expect(p.id).toBe("parent");
		expect(await p.available()).toBe(true);
		expect(await p.evaluate({ target })).toEqual({
			verdict: "unsure",
			confidence: 0,
		});
	});
});
