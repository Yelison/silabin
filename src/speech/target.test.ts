import { describe, expect, it } from "vitest";
import { curriculum } from "@/engine";
import { speechTarget } from "@/speech/target";

function item(id: string) {
	const i = curriculum.items.get(id);
	if (i === undefined) throw new Error(`falta ${id}`);
	return i;
}

describe("speechTarget", () => {
	it("S15: letter:a con mx da es-MX", () => {
		expect(speechTarget(item("letter:a"), "mx")).toEqual({
			text: "a",
			phonemes: ["a"],
			lang: "es-MX",
		});
	});

	it("S15: do y neutro dan es-US (P14)", () => {
		expect(speechTarget(item("letter:a"), "do").lang).toBe("es-US");
		expect(speechTarget(item("letter:a"), "neutro").lang).toBe("es-US");
	});
});
