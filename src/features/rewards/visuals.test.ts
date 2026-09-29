import { describe, expect, it } from "vitest";
import { COSMETICS, REWARDS } from "@/engine";
import {
	cosmeticVisual,
	hasVisual,
	rewardArt,
} from "@/features/rewards/visuals";

describe("visuals", () => {
	it("AR1/F1: hay una entrada para cada COSMETICS[].id y cada REWARDS[].id", () => {
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

	it("AR2: un cosmético de rastro trae la ruta de su partícula y de su cursor: es el único sitio que lo decide", () => {
		const burbujas = cosmeticVisual("trail:burbujas");
		if (burbujas.slot !== "trail") throw new Error("no debería pasar");
		expect(burbujas.particle?.src).toBe("/images/arte/particle-burbuja.webp");
		expect(burbujas.particle?.emoji).toBe("🫧");
		expect(burbujas.cursor).toBe("/icons/cursor-burbuja.png");

		const estrellitas = cosmeticVisual("trail:estrellitas");
		if (estrellitas.slot !== "trail") throw new Error("no debería pasar");
		expect(estrellitas.particle?.src).toBe(
			"/images/arte/particle-estrellita.webp",
		);
		expect(estrellitas.particle?.emoji).toBe("✨");
		expect(estrellitas.cursor).toBe("/icons/cursor-estrellita.png");

		const ninguno = cosmeticVisual("trail:none");
		if (ninguno.slot !== "trail") throw new Error("no debería pasar");
		expect(ninguno.particle).toBeNull();
		expect(ninguno.cursor).toBeNull();
	});

	it("AR2: los compañeros traen su imagen con y sin gorra, y los fondos su ruta y su degradado", () => {
		const segundo = cosmeticVisual("companion:second");
		if (segundo.slot !== "companion") throw new Error("no debería pasar");
		expect(segundo.art).toEqual({
			src: "/images/arte/companion-2.webp",
			emoji: "🦊",
		});
		expect(segundo.withCap).toEqual({
			src: "/images/arte/companion-2-gorra.webp",
			emoji: "🦊",
		});
		const primero = cosmeticVisual("companion:first");
		if (primero.slot !== "companion") throw new Error("no debería pasar");
		expect(primero.art.src).toBe("/images/arte/companion-1.webp");
		expect(primero.withCap.src).toBe("/images/arte/companion-1-gorra.webp");
		expect(primero.art.emoji).toBe("🐣");

		for (const [id, nombre] of [
			["bg:default", "bg-default"],
			["bg:pradera", "bg-pradera"],
			["bg:espacio", "bg-espacio"],
			["bg:bosque", "bg-bosque"],
		] as const) {
			const fondo = cosmeticVisual(id);
			if (fondo.slot !== "background") throw new Error("no debería pasar");
			expect(fondo.src).toBe(`/images/arte/${nombre}.webp`);
			expect(fondo.gradient).toMatch(/^from-\S+ to-\S+$/);
		}
	});

	it("un id de cosmético desconocido cae a bg:default", () => {
		const visual = cosmeticVisual("inventado");
		if (visual.slot !== "background") throw new Error("no debería pasar");
		expect(visual.src).toBe("/images/arte/bg-default.webp");
	});

	it("AR3: cada logro pinta la pieza que desbloquea; uno desconocido cae a 🏅", () => {
		expect(rewardArt("vowel-a").src).toBe("/images/arte/sticker-avion.webp");
		expect(rewardArt("stars:25").src).toBe("/images/arte/sticker-25.webp");
		expect(rewardArt("ten-sessions").src).toBe(
			"/images/arte/companion-1-gorra.webp",
		);
		expect(rewardArt("five-vowels").src).toBe("/images/arte/companion-2.webp");
		expect(rewardArt("first-session").src).toBe("/images/arte/bg-pradera.webp");
		expect(rewardArt("first-syllable-voice").src).toBe(
			"/images/arte/particle-estrellita.webp",
		);
		expect(rewardArt("steady-hand").src).toBe("/images/arte/bg-espacio.webp");
		expect(rewardArt("word-reader").src).toBe(
			"/images/arte/particle-burbuja.webp",
		);
		expect(rewardArt("phase2-done").src).toBe("/images/arte/trophy.webp");
		expect(rewardArt("inventado")).toEqual({ src: "", emoji: "🏅" });
	});

	it("AR4: el emoji de respaldo de un logro nunca es una letra ni una cifra (el niño lee sonidos, no nombres)", () => {
		for (const reward of REWARDS) {
			const { emoji } = rewardArt(reward.id);
			expect(emoji.length, reward.id).toBeGreaterThan(0);
			expect(emoji, reward.id).not.toMatch(/\p{L}|\p{N}/u);
			for (const ch of emoji) {
				const cp = ch.codePointAt(0) ?? 0;
				expect(
					cp >= 0x1f170 && cp <= 0x1f189,
					`${reward.id} U+${cp.toString(16)}`,
				).toBe(false);
			}
		}
	});
});
