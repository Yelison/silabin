import type { AudioRequest } from "@/audio";
import type { Item } from "@/engine";

/**
 * Lo que la interfaz hace con la pista que ordena el motor en la plantilla `trace`. Dato puro,
 * como `choiceEffect`: quien lo usa lo ejecuta y no sabe de guías ni de niveles.
 */
export type TraceEffect =
	| { kind: "none" }
	| { kind: "pulse-start" }
	| { kind: "dot"; request: AudioRequest }
	| { kind: "model" };

/**
 * La pista (`action`) de la plantilla `trace` convertida en un efecto. Una acción que no se
 * conoce no hace nada: el sonido acompaña, no manda.
 */
export function traceEffect(input: {
	action: string;
	item: Item;
}): TraceEffect {
	const { action, item } = input;
	switch (action) {
		case "restore-previous-guide-level":
			return { kind: "pulse-start" };
		case "animate-dot-along-stroke+play-phoneme":
			return { kind: "dot", request: { key: item.audioKey } };
		case "animate-full-stroke+await-retrace":
			return { kind: "model" };
		default:
			return { kind: "none" };
	}
}
