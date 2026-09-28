import { describe, expect, it } from "vitest";
import { curriculum, type Item, stretchKey } from "@/engine";
import { voiceEffect } from "@/features/session/voice/hint-effects";

function item(id: string): Item {
	const found = curriculum.items.get(id);
	if (found === undefined) throw new Error(`Falta ${id}`);
	return found;
}

describe("voiceEffect", () => {
	const SILABA = item("syllable:ma");
	const LETRA_A = item("letter:a");

	function efecto(action: string, it: Item = SILABA) {
		return voiceEffect({ action, item: it, content: curriculum });
	}

	it("Y1: convierte las acciones del motor en efectos de voz", () => {
		expect(efecto("show-mouth+replay-instruction")).toEqual({
			kind: "mouth",
			request: { key: "instruction:say-it" },
		});
		expect(efecto("split-syllables+replay-instruction")).toEqual({
			kind: "split",
			request: { key: "instruction:read-word" },
		});
		expect(efecto("lengthen-first-phoneme")).toEqual({
			kind: "sound",
			request: { key: stretchKey(SILABA.id) },
		});
		expect(efecto("play-full+accept-any-speech")).toEqual({
			kind: "model",
			request: { key: SILABA.audioKey },
		});
	});

	it("Y1: el sonido alargado es el de stretchKey, no el audioKey del ítem", () => {
		const { request } = efecto("lengthen-first-phoneme", LETRA_A) as {
			request: { key: string };
		};
		expect(request.key).toBe(stretchKey("letter:a"));
		expect(request.key).not.toBe(LETRA_A.audioKey);
	});

	it("Y1: play-first-syllable de word:ala suena como phoneme:a", () => {
		const ala = item("word:ala");
		expect(efecto("play-first-syllable", ala)).toEqual({
			kind: "sound",
			request: { key: item("phoneme:a").audioKey },
		});
	});

	it("Y1: una acción desconocida no hace nada", () => {
		expect(efecto("una-accion-que-no-existe")).toEqual({ kind: "none" });
	});
});
