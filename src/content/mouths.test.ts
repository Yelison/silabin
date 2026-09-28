import { describe, expect, it } from "vitest";
import { mouthShapesFor } from "@/content/mouths";
import { phase1Items } from "@/content/phase1";
import { phase2Items } from "@/content/phase2";
import type { Item } from "@/content/types";

const PRESENTABLES = new Set(["letter", "syllable", "word"]);

function item(id: string): Item {
	const found = [...phase1Items, ...phase2Items].find((i) => i.id === id);
	if (found === undefined) throw new Error(`No existe ${id}`);
	return found;
}

describe("mouthShapesFor", () => {
	it("V1: una letra da una forma y una sílaba da una por fonema, en orden", () => {
		expect(mouthShapesFor(item("letter:a"))).toEqual(["open"]);
		expect(mouthShapesFor(item("syllable:ma"))).toEqual(["closed", "open"]);
	});

	it("V1: cada fonema tiene su forma (a abierta, e/i estirada, o/u redonda, m/p cerrada, s dientes, l lengua)", () => {
		const forma = (fonema: string) =>
			mouthShapesFor({
				id: `x:${fonema}`,
				kind: "phoneme",
				text: fonema,
				phonemes: [fonema],
				audioKey: `phoneme:${fonema}`,
			});
		expect(
			["a", "e", "i", "o", "u", "m", "p", "s", "l"].map((f) => forma(f)[0]),
		).toEqual([
			"open",
			"spread",
			"spread",
			"round",
			"round",
			"closed",
			"closed",
			"teeth",
			"tongue",
		]);
	});

	it("V1 invariante: todo ítem letra, sílaba o palabra de las fases 1 y 2 tiene una forma por fonema", () => {
		const items = [...phase1Items, ...phase2Items].filter((i) =>
			PRESENTABLES.has(i.kind),
		);
		expect(items.length).toBeGreaterThan(30);
		for (const i of items) {
			expect(mouthShapesFor(i), i.id).toHaveLength(i.phonemes.length);
		}
	});

	it("un fonema sin forma falla alto en vez de enseñar una boca equivocada", () => {
		expect(() =>
			mouthShapesFor({
				id: "letter:z",
				kind: "letter",
				text: "z",
				phonemes: ["z"],
				audioKey: "phoneme:z",
				display: { upper: "Z", lower: "z" },
			}),
		).toThrow(/z/);
	});
});
