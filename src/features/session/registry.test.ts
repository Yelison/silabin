import { describe, expect, it } from "vitest";
import {
	curriculum,
	emptyItemProgress,
	emptyProgressState,
	type ProgressState,
	recomputeUnitStatuses,
	type TemplateId,
} from "@/engine";
import {
	IMPLEMENTED_TEMPLATES,
	isSessionPlayable,
} from "@/features/session/registry";

function progreso(): ProgressState {
	const base = emptyProgressState();
	return { ...base, units: recomputeUnitStatuses(curriculum, base) };
}

/** Marca como dominadas y presentadas las unidades hasta `hasta` (incluida). */
function conUnidadesHechasHasta(hasta: string): ProgressState {
	const items: ProgressState["items"] = {};
	for (const id of curriculum.unitOrder) {
		const unit = curriculum.units.get(id);
		for (const itemId of unit?.introduces ?? []) {
			items[itemId] = {
				...emptyItemProgress(),
				box: 3,
				firstTryCorrect: 3,
				presented: true,
				masteredAt: "2026-09-01T00:00:00.000Z",
			};
		}
		if (id === hasta) break;
	}
	const base = { ...emptyProgressState(), items };
	return { ...base, units: recomputeUnitStatuses(curriculum, base) };
}

describe("isSessionPlayable", () => {
	it("U6: con phase0:clap activa y count-syllables implementada, sí", () => {
		expect(
			isSessionPlayable(
				curriculum,
				progreso(),
				new Set<TemplateId>(["count-syllables"]),
			),
		).toBe(true);
	});

	it("U6: con phase0:rhyme activa, no: su plantilla no está implementada", () => {
		const p = conUnidadesHechasHasta("phase0:clap");
		expect(p.units["phase0:rhyme"]?.status).toBe("active");
		expect(
			isSessionPlayable(
				curriculum,
				p,
				new Set<TemplateId>(["count-syllables"]),
			),
		).toBe(false);
	});

	it("U6: con el conjunto vacío, no", () => {
		expect(isSessionPlayable(curriculum, progreso(), new Set())).toBe(false);
	});

	it("exige TODAS las plantillas de la unidad activa, no alguna", () => {
		const unit = curriculum.units.get("phase0:hear-it");
		const plantillas = [...new Set(unit?.exercises.map((e) => e.templateId))];
		// La premisa del test: hay una unidad con más de una plantilla distinta.
		const multi = [...curriculum.units.values()].find(
			(u) => new Set(u.exercises.map((e) => e.templateId)).size > 1,
		);
		expect(multi).toBeDefined();
		expect(plantillas.length).toBeGreaterThan(0);
		const p = conUnidadesHechasHasta(
			curriculum.unitOrder[curriculum.unitOrder.indexOf(multi?.id ?? "") - 1] ??
				"",
		);
		expect(p.units[multi?.id ?? ""]?.status).toBe("active");
		const ids = [...new Set(multi?.exercises.map((e) => e.templateId))];
		const [primera, ...resto] = ids;
		expect(resto.length).toBeGreaterThan(0);
		expect(
			isSessionPlayable(
				curriculum,
				p,
				new Set<TemplateId>(primera === undefined ? [] : [primera]),
			),
		).toBe(false);
		expect(isSessionPlayable(curriculum, p, new Set<TemplateId>(ids))).toBe(
			true,
		);
	});

	it("sin unidad activa (repaso), exige las plantillas de las unidades con algo presentado", () => {
		const hecho = conUnidadesHechasHasta(
			curriculum.unitOrder
				.filter((id) => (curriculum.units.get(id)?.introduces.length ?? 0) > 0)
				.at(-1) ?? "",
		);
		expect(Object.values(hecho.units).some((u) => u.status === "active")).toBe(
			false,
		);
		// Solo count-syllables implementada: el repaso también toca otras plantillas.
		expect(
			isSessionPlayable(
				curriculum,
				hecho,
				new Set<TemplateId>(["count-syllables"]),
			),
		).toBe(false);
		const todas = new Set<TemplateId>(
			[...curriculum.units.values()].flatMap((u) =>
				u.exercises.map((e) => e.templateId),
			),
		);
		expect(isSessionPlayable(curriculum, hecho, todas)).toBe(true);
	});

	it("en repaso solo cuentan las unidades con algún ítem presentado", () => {
		// Todo terminado, pero solo phase0:clap tiene ítems presentados.
		const hecho = conUnidadesHechasHasta(
			curriculum.unitOrder
				.filter((id) => (curriculum.units.get(id)?.introduces.length ?? 0) > 0)
				.at(-1) ?? "",
		);
		const soloClap: ProgressState = { ...hecho, items: {} };
		for (const id of curriculum.units.get("phase0:clap")?.introduces ?? []) {
			const it = hecho.items[id];
			if (it !== undefined) soloClap.items[id] = it;
		}
		const conUnidadesDone: ProgressState = {
			...soloClap,
			units: hecho.units,
		};
		expect(
			isSessionPlayable(
				curriculum,
				conUnidadesDone,
				new Set<TemplateId>(["count-syllables"]),
			),
		).toBe(true);
	});

	it("hoy solo count-syllables está implementada", () => {
		expect([...IMPLEMENTED_TEMPLATES]).toEqual(["count-syllables"]);
	});
});
