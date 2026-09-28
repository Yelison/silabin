import type { CurriculumIndex } from "@/content/index";
import { stripDiacritics, VOWELS } from "@/content/invariants";
import type { Item } from "@/content/types";
import type { PlannedExercise } from "@/engine/types";

/**
 * La única fuente de la respuesta esperada de un ejercicio: `checkAnswer` la usa y ya no
 * decide por su cuenta. `correctOptionId` manda cuando existe (las plantillas con opciones);
 * si no, `item.task.answer` (las tareas orales); si tampoco, `build` compara con el texto de
 * la sílaba porque ahí la "opción correcta" es el orden de las piezas, no una entre varias.
 * `null` queda para las plantillas de trazo y de voz: su evaluación no compara texto
 * (`submitTrace` puntúa la geometría y `submitSpeech` recibe el veredicto del adulto).
 */
export function expectedAnswer(
	exercise: PlannedExercise,
	item: Item,
): string | null {
	if (exercise.correctOptionId !== null) return exercise.correctOptionId;
	if (item.task?.answer !== undefined) return item.task.answer;
	if (exercise.templateId === "build") return item.text;
	return null;
}

/** Ids de las piezas correctas de `build`, en orden. Vacío en cualquier otra plantilla. */
export function expectedPieces(
	exercise: PlannedExercise,
	content: CurriculumIndex,
	item: Item,
): string[] {
	if (exercise.templateId !== "build") return [];
	return item.phonemes.map((phoneme) => {
		const id = `letter:${phoneme}`;
		if (!content.items.has(id))
			throw new Error(`No existe la letra ${id} para el ítem ${item.id}`);
		return id;
	});
}

/**
 * `build`, pista de rung 1: las piezas que siguen activas tras atenuar las que no entran.
 * Se filtra sobre las piezas ya presentes en el ejercicio (no se recalculan de cero), así
 * que solo quedan la consonante correcta y las 5 vocales, aunque el ejercicio trajera otras
 * consonantes ya vistas.
 */
export function reducedPieces(
	exercise: PlannedExercise,
	content: CurriculumIndex,
	item: Item,
): string[] {
	if (exercise.templateId !== "build") return [];
	const consonant = item.phonemes[0];
	const consonantId = `letter:${consonant}`;
	if (!content.items.has(consonantId))
		throw new Error(
			`No existe la letra ${consonantId} para el ítem ${item.id}`,
		);
	return exercise.optionIds.filter(
		(id) => id === consonantId || VOWELS.has(id.slice("letter:".length)),
	);
}

/**
 * Audio de la primera sílaba de una palabra (pista 2 de `read-word`): el `audioKey` del ítem
 * `syllable:<s>` si existe; si la sílaba es una vocal sola, el de `phoneme:<v>`. Lanza si el
 * ítem no es una palabra o si no hay ninguno de los dos.
 */
export function firstSyllableAudioKey(
	content: CurriculumIndex,
	item: Item,
): string {
	if (item.kind !== "word")
		throw new Error(`El ítem ${item.id} no es una palabra`);
	const first = item.syllables?.[0];
	if (first === undefined)
		throw new Error(`La palabra ${item.id} no tiene sílabas`);
	const base = stripDiacritics(first);
	const syllable = content.items.get(`syllable:${base}`);
	if (syllable !== undefined) return syllable.audioKey;
	if (VOWELS.has(base)) {
		const vowel = content.items.get(`phoneme:${base}`);
		if (vowel !== undefined) return vowel.audioKey;
	}
	throw new Error(`No hay audio para la primera sílaba de ${item.id}`);
}
