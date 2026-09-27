import { describe, expect, it } from "vitest";
import { curriculum, type Item } from "@/engine";
import { traceEffect } from "@/features/session/trace/hint-effects";

function item(id: string): Item {
	const found = curriculum.items.get(id);
	if (found === undefined) throw new Error(`Falta ${id}`);
	return found;
}

describe("traceEffect", () => {
	const LETRA_A = item("letter:a");

	it("H1: convierte las 3 acciones del motor y da 'none' ante una desconocida", () => {
		expect(
			traceEffect({ action: "restore-previous-guide-level", item: LETRA_A }),
		).toEqual({ kind: "pulse-start" });
		expect(
			traceEffect({
				action: "animate-dot-along-stroke+play-phoneme",
				item: LETRA_A,
			}),
		).toEqual({ kind: "dot", request: { key: LETRA_A.audioKey } });
		expect(
			traceEffect({
				action: "animate-full-stroke+await-retrace",
				item: LETRA_A,
			}),
		).toEqual({ kind: "model" });
		expect(
			traceEffect({ action: "una-accion-que-no-existe", item: LETRA_A }),
		).toEqual({ kind: "none" });
	});

	it("la pista de audio pide siempre item.audioKey, no una clave fija", () => {
		const LETRA_E = item("letter:e");
		expect(
			traceEffect({
				action: "animate-dot-along-stroke+play-phoneme",
				item: LETRA_E,
			}),
		).toEqual({ kind: "dot", request: { key: LETRA_E.audioKey } });
	});
});
