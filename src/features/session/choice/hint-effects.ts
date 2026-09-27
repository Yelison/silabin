import type { AudioRequest } from "@/audio";
import {
	endingKey,
	type Item,
	type PlannedExercise,
	stretchInKey,
	stretchKey,
} from "@/engine";

/**
 * Lo que la interfaz hace con la pista que ordena el motor en las plantillas de elección.
 * Es un dato puro: `ChoiceEvaluation` lo ejecuta y no sabe de qué plantilla viene.
 */
export type ChoiceEffect =
	| { kind: "none" }
	| { kind: "dim"; optionId: string; replay: AudioRequest }
	| { kind: "replay"; request: AudioRequest }
	| { kind: "sequence"; steps: { optionId: string; request: AudioRequest }[] }
	| { kind: "pulse"; optionId: string | null; request: AudioRequest }
	| { kind: "mark"; optionId: string };

/**
 * La palabra partida en inicio y resto (`["a", "vión"]`), o `null` si tiene una sola sílaba y
 * no hay nada que partir.
 */
export function onsetSplit(
	syllables: readonly string[] | undefined,
): [string, string] | null {
	if (syllables === undefined || syllables.length < 2) return null;
	const [primera = "", ...resto] = syllables;
	return [primera, resto.join("")];
}

/** El inicio de una imagen, sonando partido; si no se puede partir, la palabra entera. */
function onsetRequest(picture: Item): AudioRequest {
	const partes = onsetSplit(picture.syllables);
	if (partes === null) return { key: picture.audioKey };
	return { key: picture.audioKey, style: "by-syllable", syllables: partes };
}

/**
 * La pista (`action`) de una plantilla de elección convertida en un efecto. Una acción que no
 * se conoce no hace nada: el sonido acompaña, no manda. Nunca calcula la respuesta correcta:
 * marca la que le pasa el motor en `expected`.
 */
export function choiceEffect(input: {
	action: string;
	exercise: PlannedExercise;
	item: Item;
	/** En el orden de pantalla; en hear-it, `["si", "no"]`. */
	optionIds: readonly string[];
	/** `expectedAnswer(exercise, item)`. */
	expected: string;
	lookup(id: string): Item | undefined;
}): ChoiceEffect {
	const { action, exercise, item, optionIds, expected, lookup } = input;
	switch (action) {
		case "replay-target-ending":
			return {
				kind: "replay",
				request: { key: endingKey(`picture:${item.text}`) },
			};
		case "replay-each-option-ending":
			return {
				kind: "sequence",
				steps: optionIds.map((id) => ({
					optionId: id,
					request: { key: endingKey(id) },
				})),
			};
		case "dim-one-distractor+replay-phoneme":
		case "dim-one-distractor+replay": {
			const distractor = exercise.optionIds.find((id) => id !== expected);
			if (distractor === undefined) return { kind: "none" };
			return {
				kind: "dim",
				optionId: distractor,
				replay: { key: item.audioKey },
			};
		}
		case "replay-each-option-onset": {
			const steps = optionIds.flatMap((id) => {
				const picture = lookup(id);
				return picture === undefined
					? []
					: [{ optionId: id, request: onsetRequest(picture) }];
			});
			return { kind: "sequence", steps };
		}
		case "replay-word-slowly":
			return {
				kind: "replay",
				request:
					item.syllables === undefined
						? { key: `word:${item.text}` }
						: {
								key: `word:${item.text}`,
								style: "by-syllable",
								syllables: item.syllables,
							},
			};
		case "lengthen-target-phoneme-in-word":
			// Solo audio: en hear-it los botones son «sí» y «no», ninguno pulsa con esta pista.
			return {
				kind: "pulse",
				optionId: null,
				request: {
					key: expected === "si" ? stretchInKey(item.id) : `word:${item.text}`,
				},
			};
		case "pulse-correct+lengthen-first-phoneme":
			return {
				kind: "pulse",
				optionId: expected,
				request: { key: stretchKey(item.id) },
			};
		case "mark-correct+await-tap":
		case "mark-correct-button+await-tap":
			return { kind: "mark", optionId: expected };
		default:
			return { kind: "none" };
	}
}
