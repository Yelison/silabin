import { describe, expect, it } from "vitest";
import { worldNodeVisualFor } from "@/features/dev/world-node-visuals";

describe("worldNodeVisualFor", () => {
	it("mantiene landmarks únicos para las cuatro habilidades orales", () => {
		expect(worldNodeVisualFor("phase0:clap").kind).toBe("rhythm-stage");
		expect(worldNodeVisualFor("phase0:rhyme").kind).toBe("rhyme-bounce");
		expect(worldNodeVisualFor("phase0:initial").kind).toBe("sound-detective");
		expect(worldNodeVisualFor("phase0:hear-it").kind).toBe("listening-station");
	});

	it("resuelve cualquier vocal con la misma familia", () => {
		expect(worldNodeVisualFor("phase1:vowel-a")).toMatchObject({
			kind: "vowel-garden",
			variant: "a",
			asset: "node-vowel-base.webp",
		});
		expect(worldNodeVisualFor("phase1:vowel-u")).toMatchObject({
			kind: "vowel-garden",
			variant: "u",
		});
	});

	it("resuelve consonantes actuales y futuras sin añadir mappings manuales", () => {
		for (const unitId of [
			"phase2:m",
			"phase2:p",
			"phase3:t",
			"phase3:enie",
			"phase3:c",
			"phase3:b",
			"phase3:z",
		]) {
			expect(worldNodeVisualFor(unitId).kind).toBe("syllable-workshop");
		}
	});

	it("usa un fallback neutral para familias todavía desconocidas", () => {
		expect(worldNodeVisualFor("phase4:example")).toMatchObject({
			kind: "future-landmark",
			asset: "node-future-base.webp",
		});
	});
});
