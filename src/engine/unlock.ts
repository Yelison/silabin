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

		// Una unidad que no introduce ningún ítem no es jugable: existe solo para que el mapa
		// enseñe el camino futuro bloqueado (spec §4, "Fases 3+: definidas como unidades vacías
		// en content/ para que el mapa muestre el camino futuro bloqueado"). Se queda en locked
		// para siempre. La comprobación va ANTES de la garantía de no retroceder a propósito: si
		// un documento guardado trae una de estas unidades como 'done' —solo pudo marcarla así el
		// fallo que esto corrige— se sanea al recalcular. No hay castigo: una unidad sin ítems no
		// puede haber costado al niño ni un ejercicio, así que ahí no hay progreso que quitar.
		if (unit.introduces.length === 0) {
			out[unitId] = { status: "locked", bestStars };
			continue;
		}

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

/**
 * La unidad que toca jugar, o null cuando ya no queda ninguna: el niño terminó todo el
 * currículo jugable. Ese null es una señal honesta, no un error; el Plan 2 lo traducirá a
 * "ya te lo sabes todo, sigamos repasando" y planificará una sesión de solo repaso.
 *
 * Nunca devuelve una unidad que no introduce nada. Antes caía a la última del orden
 * topológico, que es una unidad vacía de la Fase 3, y con ese id el planificador producía
 * sesiones con ítems repetidos, repasos etiquetados como de la unidad activa y, con el
 * currículo recién dominado, ninguna sesión en absoluto.
 */
export function activeUnitId(
	content: CurriculumIndex,
	state: ProgressState,
): string | null {
	const statuses = recomputeUnitStatuses(content, state);
	return (
		content.unitOrder.find((id) => statuses[id]?.status === "active") ?? null
	);
}
