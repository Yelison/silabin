import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { MASTERY_TARGET } from "@/engine/mastery";
import { progressReport, unitProgress } from "@/engine/progress-report";
import { emptyItemProgress, emptyProgressState } from "@/engine/types";

describe("K6 progressReport con emptyProgressState()", () => {
	const report = progressReport(curriculum, emptyProgressState());

	it("tiene las tres fases 0, 1 y 2", () => {
		expect(report.map((p) => p.phase)).toEqual([0, 1, 2]);
	});

	it("ninguna unidad es de la Fase 3", () => {
		for (const phase of report) {
			for (const unit of phase.units) {
				expect(unit.unitId.startsWith("phase3:")).toBe(false);
			}
		}
	});

	it("todos los ítems están unseen", () => {
		for (const phase of report) {
			for (const unit of phase.units) {
				for (const item of unit.items) {
					expect(item.status).toBe("unseen");
				}
			}
		}
	});

	it("la primera unidad está active y las demás locked", () => {
		const allUnits = report.flatMap((p) => p.units);
		expect(allUnits[0]?.status).toBe("active");
		for (const unit of allUnits.slice(1)) {
			expect(unit.status).toBe("locked");
		}
	});
});

describe("K7 progressReport con progreso mixto", () => {
	const state = emptyProgressState();
	state.items["letter:a"] = {
		...emptyItemProgress(),
		presented: true,
		box: 3,
		firstTryCorrect: MASTERY_TARGET,
	};
	state.items["letter:e"] = {
		...emptyItemProgress(),
		presented: true,
		box: 1,
	};
	// Recién presentado, sin evaluar todavía: box sigue en 0. La regla es "presentado y sin
	// dominar" → learning, no "box > 0": eso lo distingue de un ítem que nunca se ha visto.
	state.items["phoneme:o"] = {
		...emptyItemProgress(),
		presented: true,
		box: 0,
	};
	const report = progressReport(curriculum, state);
	const allUnits = report.flatMap((p) => p.units);

	it("en phase1:vowel-a, letter:a está mastered y los recuentos cuadran", () => {
		const unit = allUnits.find((u) => u.unitId === "phase1:vowel-a");
		expect(unit).toBeDefined();
		if (unit === undefined) return;
		const letterA = unit.items.find((i) => i.itemId === "letter:a");
		expect(letterA?.status).toBe("mastered");
		expect(
			unit.counts.mastered + unit.counts.learning + unit.counts.unseen,
		).toBe(unit.items.length);
	});

	it("en phase1:vowel-e, letter:e está learning", () => {
		const unit = allUnits.find((u) => u.unitId === "phase1:vowel-e");
		expect(unit).toBeDefined();
		if (unit === undefined) return;
		const letterE = unit.items.find((i) => i.itemId === "letter:e");
		expect(letterE?.status).toBe("learning");
	});

	it("un ítem presentado con box 0 (recién enseñado, sin evaluar) está learning, no unseen", () => {
		const unit = allUnits.find((u) => u.unitId === "phase1:vowel-o");
		expect(unit).toBeDefined();
		if (unit === undefined) return;
		const phonemeO = unit.items.find((i) => i.itemId === "phoneme:o");
		expect(phonemeO?.status).toBe("learning");
	});

	it("la suma de counts es igual a items.length en todas las unidades", () => {
		for (const unit of allUnits) {
			const sum =
				unit.counts.mastered + unit.counts.learning + unit.counts.unseen;
			expect(sum).toBe(unit.items.length);
		}
	});
});

describe("K8 unitProgress", () => {
	it("phase0:clap vacío devuelve {0, n} con n igual al total de ítems que introduce", () => {
		const unit = curriculum.units.get("phase0:clap");
		expect(unit).toBeDefined();
		const result = unitProgress(
			curriculum,
			emptyProgressState(),
			"phase0:clap",
		);
		expect(result).toEqual({ mastered: 0, total: unit?.introduces.length });
	});

	it("con dos ítems dominados devuelve {2, n}", () => {
		const unit = curriculum.units.get("phase0:clap");
		expect(unit).toBeDefined();
		if (unit === undefined) return;
		const state = emptyProgressState();
		const [first, second] = unit.introduces;
		expect(first).toBeDefined();
		expect(second).toBeDefined();
		if (first === undefined || second === undefined) return;
		state.items[first] = {
			...emptyItemProgress(),
			presented: true,
			firstTryCorrect: MASTERY_TARGET,
		};
		state.items[second] = {
			...emptyItemProgress(),
			presented: true,
			firstTryCorrect: MASTERY_TARGET,
		};
		const result = unitProgress(curriculum, state, "phase0:clap");
		expect(result).toEqual({ mastered: 2, total: unit.introduces.length });
	});

	it("una unidad desconocida lanza", () => {
		expect(() =>
			unitProgress(curriculum, emptyProgressState(), "phase9:x"),
		).toThrow();
	});
});
