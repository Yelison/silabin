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
	return unitMasteryRatio(content, state, unitId) >= UNIT_COMPLETION_THRESHOLD;
}
