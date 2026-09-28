import type { AudioRequest } from "@/audio";
import {
	type CurriculumIndex,
	firstSyllableAudioKey,
	type Item,
	stretchKey,
} from "@/engine";

/**
 * Lo que la interfaz hace con la pista que ordena el motor en las plantillas de voz. Dato puro,
 * como `traceEffect`: quien lo usa lo ejecuta y no sabe de escaleras ni de niveles.
 */
export type VoiceEffect =
	| { kind: "none" }
	// `say-it`, rung 1: la boca articulando y la instrucción, sin dar el sonido.
	| { kind: "mouth"; request: AudioRequest }
	// `read-word`, rung 1: las sílabas separadas y la instrucción.
	| { kind: "split"; request: AudioRequest }
	// Rung 2: el sonido alargado o la primera sílaba.
	| { kind: "sound"; request: AudioRequest }
	// Rung 3: el objetivo entero y el turno en modo «model».
	| { kind: "model"; request: AudioRequest };

/**
 * La pista (`action`) de una plantilla de voz convertida en un efecto. Una acción que no se
 * conoce no hace nada: el sonido acompaña, no manda.
 */
export function voiceEffect(input: {
	action: string;
	item: Item;
	content: CurriculumIndex;
}): VoiceEffect {
	const { action, item, content } = input;
	switch (action) {
		case "show-mouth+replay-instruction":
			return { kind: "mouth", request: { key: "instruction:say-it" } };
		case "split-syllables+replay-instruction":
			return { kind: "split", request: { key: "instruction:read-word" } };
		case "lengthen-first-phoneme":
			return { kind: "sound", request: { key: stretchKey(item.id) } };
		case "play-first-syllable":
			return {
				kind: "sound",
				request: { key: firstSyllableAudioKey(content, item) },
			};
		case "play-full+accept-any-speech":
			return { kind: "model", request: { key: item.audioKey } };
		default:
			return { kind: "none" };
	}
}
