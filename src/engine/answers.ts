import type { CurriculumIndex } from "@/content/index";
import { VOWELS } from "@/content/invariants";
import type { Item } from "@/content/types";
import type { PlannedExercise } from "@/engine/types";

/**
 * La única fuente de la respuesta esperada de un ejercicio: `checkAnswer` la usa y ya no
 * decide por su cuenta. `correctOptionId` manda cuando existe (las plantillas con opciones);
 * si no, `item.task.answer` (las tareas orales); si tampoco, `build` compara con el texto de
 * la sílaba porque ahí la "opción correcta" es el orden de las piezas, no una entre varias.
 * `null` solo queda para las plantillas sin evaluador propio todavía (trazo y voz).
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
