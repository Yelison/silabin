import type { CurriculumIndex } from "@/content/index";
import { isMastered, itemProgressOf } from "@/engine/mastery";
import type { ProgressState, Stars, UnitStatus } from "@/engine/types";
import { recomputeUnitStatuses } from "@/engine/unlock";

export type ItemStatus = "mastered" | "learning" | "unseen";

export type UnitReport = {
	unitId: string;
	title: string;
	status: UnitStatus;
	bestStars: Stars;
	counts: Record<ItemStatus, number>;
	items: Array<{ itemId: string; text: string; status: ItemStatus }>;
};

export type PhaseReport = { phase: 0 | 1 | 2; units: UnitReport[] };

function itemStatusOf(state: ProgressState, itemId: string): ItemStatus {
	const progress = itemProgressOf(state, itemId);
	if (!progress.presented) return "unseen";
	if (isMastered(progress)) return "mastered";
	return "learning";
}

/** Fases 0-2 en el orden del currículo. Las unidades vacías de la Fase 3 no salen. */
export function progressReport(
	content: CurriculumIndex,
	state: ProgressState,
): PhaseReport[] {
	const unitStatuses = recomputeUnitStatuses(content, state);
	const phases: PhaseReport[] = [
		{ phase: 0, units: [] },
		{ phase: 1, units: [] },
		{ phase: 2, units: [] },
	];

	for (const unitId of content.unitOrder) {
		const unit = content.units.get(unitId);
		if (unit === undefined || unit.phase === 3) continue;

		const items = unit.introduces.map((itemId) => ({
			itemId,
			text: content.items.get(itemId)?.text ?? itemId,
			status: itemStatusOf(state, itemId),
		}));

		const counts: Record<ItemStatus, number> = {
			mastered: 0,
			learning: 0,
			unseen: 0,
		};
		for (const item of items) counts[item.status] += 1;

		const phaseReport = phases.find((p) => p.phase === unit.phase);
		if (phaseReport === undefined) continue;

		const unitStatus = unitStatuses[unitId];
		phaseReport.units.push({
			unitId,
			title: unit.title,
			status: unitStatus?.status ?? "locked",
			bestStars: unitStatus?.bestStars ?? 0,
			counts,
			items,
		});
	}

	return phases;
}

/** Ítems dominados de `unit.introduces`. Lanza con una unidad desconocida. */
export function unitProgress(
	content: CurriculumIndex,
	state: ProgressState,
	unitId: string,
): { mastered: number; total: number } {
	const unit = content.units.get(unitId);
	if (unit === undefined) throw new Error(`Unidad desconocida: ${unitId}`);
	const mastered = unit.introduces.filter((id) =>
		isMastered(itemProgressOf(state, id)),
	).length;
	return { mastered, total: unit.introduces.length };
}
