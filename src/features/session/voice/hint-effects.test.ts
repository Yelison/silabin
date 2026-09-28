import { describe, expect, it } from "vitest";
import { curriculum, type Item, stretchKey, templates } from "@/engine";
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

	it("W4: ninguna pista de read-word lanza con ningún ítem que esa plantilla admite", () => {
		const palabras = [...curriculum.items.values()].filter((i) =>
			templates["read-word"].itemKinds.includes(i.kind),
		);
		expect(palabras.length).toBeGreaterThan(0);
		for (const palabra of palabras) {
			for (const hint of templates["read-word"].hints) {
				expect(
					() => efecto(hint.action, palabra),
					`${palabra.id}: ${hint.action}`,
				).not.toThrow();
				expect(efecto(hint.action, palabra).kind).not.toBe("none");
			}
		}
	});

	it("Y1: una acción desconocida no hace nada", () => {
		expect(efecto("una-accion-que-no-existe")).toEqual({ kind: "none" });
	});
});
