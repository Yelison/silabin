import { phase0Items, phase0Units } from "@/content/phase0";
import { phase1Items, phase1Units } from "@/content/phase1";
import { phase2Items, phase2Units } from "@/content/phase2";
import { phase3Units } from "@/content/phases-future";
import { pictures } from "@/content/pictures";
import {
	type Curriculum,
	curriculumSchema,
	type Item,
	type Unit,
} from "@/content/types";

export type CurriculumIndex = {
	items: ReadonlyMap<string, Item>;
	units: ReadonlyMap<string, Unit>;
	unitOrder: string[];
};

function topologicalOrder(units: Unit[]): string[] {
	const pending = new Map(units.map((u) => [u.id, new Set(u.requires)]));
	const order: string[] = [];
	while (pending.size > 0) {
		const ready = [...pending.entries()]
			.filter(([, requires]) => [...requires].every((id) => order.includes(id)))
			.map(([id]) => id)
			.sort();
		const next = ready[0];
		if (next === undefined) {
			throw new Error(
				`Hay un ciclo de prerrequisitos entre: ${[...pending.keys()].join(", ")}`,
			);
		}
		order.push(next);
		pending.delete(next);
	}
	return order;
}

export function buildCurriculum(raw: Curriculum): CurriculumIndex {
	curriculumSchema.parse(raw);

	const items = new Map<string, Item>();
	for (const item of raw.items) {
		if (items.has(item.id)) throw new Error(`Id de ítem repetido: ${item.id}`);
		items.set(item.id, item);
	}

	const units = new Map<string, Unit>();
	for (const unit of raw.units) {
		if (units.has(unit.id))
			throw new Error(`Id de unidad repetido: ${unit.id}`);
		units.set(unit.id, unit);
	}

	for (const unit of units.values()) {
		for (const required of unit.requires) {
			if (!units.has(required)) {
				throw new Error(
					`La unidad ${unit.id} declara un prerrequisito inexistente: ${required}`,
				);
			}
		}
		for (const id of unit.introduces) {
			if (!items.has(id)) {
				throw new Error(
					`La unidad ${unit.id} introduce un ítem inexistente: ${id}`,
				);
			}
		}
	}

	const introduced = new Set<string>();
	for (const unit of units.values()) {
		for (const id of unit.introduces) {
			if (introduced.has(id))
				throw new Error(`El ítem ${id} se introduce en más de una unidad`);
			introduced.add(id);
		}
	}

	return { items, units, unitOrder: topologicalOrder([...units.values()]) };
}

export const curriculum: CurriculumIndex = buildCurriculum({
	items: [...pictures, ...phase0Items, ...phase1Items, ...phase2Items],
	units: [...phase0Units, ...phase1Units, ...phase2Units, ...phase3Units],
});
