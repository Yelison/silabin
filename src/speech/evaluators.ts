import type { SpeechEvaluator } from "@/speech/types";

/** El adulto decide: no hay veredicto automático, así que siempre `unsure`. */
export function createParentEvaluator(): SpeechEvaluator {
	return {
		id: "parent",
		available: async () => true,
		evaluate: async () => ({ verdict: "unsure", confidence: 0 }),
	};
}

const ORDEN_AUTO: readonly SpeechEvaluator["id"][] = [
	"azure",
	"browser",
	"parent",
];

async function disponible(e: SpeechEvaluator): Promise<boolean> {
	try {
		return await e.available();
	} catch {
		return false;
	}
}

/** `parent` (P9, modo del adulto) fuerza al adulto; `auto` toma el mejor disponible. */
export async function pickEvaluator(
	evaluators: readonly SpeechEvaluator[],
	mode: "auto" | "parent",
): Promise<SpeechEvaluator> {
	if (mode === "parent") {
		const parent = evaluators.find((e) => e.id === "parent");
		if (parent === undefined) throw new Error("No hay evaluador parent");
		return parent;
	}
	for (const id of ORDEN_AUTO) {
		for (const e of evaluators) {
			if (e.id === id && (await disponible(e))) return e;
		}
	}
	throw new Error("No hay ningún evaluador disponible");
}
