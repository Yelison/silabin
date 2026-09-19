import type { CurriculumIndex } from "@/content/index";
import type { ItemProgress, ProgressState } from "@/engine/types";
import { emptyItemProgress } from "@/engine/types";

export const MASTERY_TARGET = 3;
export const UNIT_COMPLETION_THRESHOLD = 0.8;

export function isMastered(progress: ItemProgress): boolean {
	return progress.firstTryCorrect >= MASTERY_TARGET;
}

export function itemProgressOf(
	state: ProgressState,
	itemId: string,
): ItemProgress {
	return state.items[itemId] ?? emptyItemProgress();
}

export function unitMasteryRatio(
	content: CurriculumIndex,
	state: ProgressState,
	unitId: string,
): number {
	const unit = content.units.get(unitId);
	if (unit === undefined) throw new Error(`Unidad desconocida: ${unitId}`);
	if (unit.introduces.length === 0) return 1;
	const mastered = unit.introduces.filter((id) =>
		isMastered(itemProgressOf(state, id)),
	).length;
	return mastered / unit.introduces.length;
}

export function isUnitComplete(
	content: CurriculumIndex,
	state: ProgressState,
	unitId: string,
): boolean {
	const unit = content.units.get(unitId);
	if (unit === undefined) throw new Error(`Unidad desconocida: ${unitId}`);
	// Una unidad que no introduce nada no se puede completar: no hay nada que dominar en
	// ella. El 1 que devuelve unitMasteryRatio en ese caso es solo la salvaguarda de no
	// dividir entre cero, nunca un "ya está terminada". Sin esta línea, las 8 unidades
	// vacías de la Fase 3 se daban por terminadas en cascada y el mapa del Plan 2 habría
	// dibujado toda la Fase 3 como pasada en vez de como el camino que viene.
	if (unit.introduces.length === 0) return false;
	return unitMasteryRatio(content, state, unitId) >= UNIT_COMPLETION_THRESHOLD;
}
