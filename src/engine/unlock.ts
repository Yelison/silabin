import type { CurriculumIndex } from "@/content/index";
import { isUnitComplete } from "@/engine/mastery";
import type { ProgressState, UnitProgress, UnitStatus } from "@/engine/types";

export function recomputeUnitStatuses(
	content: CurriculumIndex,
	state: ProgressState,
): Record<string, UnitProgress> {
	const out: Record<string, UnitProgress> = {};

	for (const unitId of content.unitOrder) {
		const unit = content.units.get(unitId);
		if (unit === undefined) continue;
		const previous = state.units[unitId];
		const bestStars = previous?.bestStars ?? 0;

		// El progreso nunca retrocede: lo que ya estaba terminado sigue terminado.
		if (previous?.status === "done") {
			out[unitId] = { status: "done", bestStars };
			continue;
		}

		const requirementsMet = unit.requires.every(
			(id) => out[id]?.status === "done",
		);
		let status: UnitStatus = "locked";
		if (requirementsMet) {
			status = isUnitComplete(content, state, unitId) ? "done" : "active";
		}
		out[unitId] = { status, bestStars };
	}

	return out;
}

export function activeUnitId(
	content: CurriculumIndex,
	state: ProgressState,
): string {
	const statuses = recomputeUnitStatuses(content, state);
	const active = content.unitOrder.find(
		(id) => statuses[id]?.status === "active",
	);
	if (active !== undefined) return active;
	const last = content.unitOrder.at(-1);
	if (last === undefined) throw new Error("El currículo no tiene unidades");
	return last;
}
