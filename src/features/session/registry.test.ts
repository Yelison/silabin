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
	templateViews,
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

	it("R8: con unidad activa, exige también las plantillas de las unidades con algo presentado, porque el repaso las usa", () => {
		// phase0:rhyme activa con su plantilla implementada, pero clap (ya presentada) usa
		// count-syllables, que aquí no lo está: el repaso podría sacar un ejercicio sin vista.
		const p = conUnidadesHechasHasta("phase0:clap");
		expect(p.units["phase0:rhyme"]?.status).toBe("active");
		expect(
			isSessionPlayable(curriculum, p, new Set<TemplateId>(["rhyme"])),
		).toBe(false);
		expect(
			isSessionPlayable(
				curriculum,
				p,
				new Set<TemplateId>(["rhyme", "count-syllables"]),
			),
		).toBe(true);
	});

	it("R8: las plantillas de una unidad sin nada presentado no se exigen", () => {
		// Con clap activa y nada presentado, phase0:rhyme (no presentada) no cuenta.
		expect(
			isSessionPlayable(
				curriculum,
				progreso(),
				new Set<TemplateId>(["count-syllables"]),
			),
		).toBe(true);
	});

	it("exige TODAS las plantillas de la unidad activa, no alguna", () => {
		// La premisa del test: hay una unidad con más de una plantilla distinta.
		const multi = [...curriculum.units.values()].find(
			(u) => new Set(u.exercises.map((e) => e.templateId)).size > 1,
		);
		expect(multi).toBeDefined();
		const posicion = curriculum.unitOrder.indexOf(multi?.id ?? "");
		const anteriores = curriculum.unitOrder.slice(0, posicion);
		const p = conUnidadesHechasHasta(anteriores.at(-1) ?? "");
		expect(p.units[multi?.id ?? ""]?.status).toBe("active");
		// Lo que exigen las unidades anteriores (presentadas) ya está cubierto.
		const previas = anteriores.flatMap((id) =>
			(curriculum.units.get(id)?.exercises ?? []).map((e) => e.templateId),
		);
		const propias = [...new Set(multi?.exercises.map((e) => e.templateId))];
		const [primera, ...resto] = propias;
		expect(resto.length).toBeGreaterThan(0);
		expect(
			isSessionPlayable(
				curriculum,
				p,
				new Set<TemplateId>([
					...previas,
					...(primera === undefined ? [] : [primera]),
				]),
			),
		).toBe(false);
		expect(
			isSessionPlayable(
				curriculum,
				p,
				new Set<TemplateId>([...previas, ...propias]),
			),
		).toBe(true);
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

describe("templateViews", () => {
	it("cada plantilla que se declara jugable tiene su Presentation y su Evaluation registradas", () => {
		for (const id of IMPLEMENTED_TEMPLATES) {
			expect(templateViews[id]?.Presentation, id).toBeTypeOf("function");
			expect(templateViews[id]?.Evaluation, id).toBeTypeOf("function");
		}
	});
});
