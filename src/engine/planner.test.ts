import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { templates } from "@/content/templates";
import { MAX_PRESENTATIONS, planSession } from "@/engine/planner";
import {
	emptyItemProgress,
	emptyProgressState,
	type ProgressState,
} from "@/engine/types";

function plan(
	state: ProgressState,
	unitId: string,
	length: 5 | 6 = 5,
	seed = 1,
) {
	return planSession({
		content: curriculum,
		state,
		activeUnitId: unitId,
		sessionLength: length,
		seed,
	});
}

/** Deja la unidad con todos sus ítems ya presentados y en caja 1. */
function presented(
	unitId: string,
	state = emptyProgressState(),
): ProgressState {
	const unit = curriculum.units.get(unitId);
	const next = { ...state, items: { ...state.items } };
	for (const id of unit?.introduces ?? []) {
		next.items[id] = {
			...emptyItemProgress(),
			presented: true,
			box: 1,
			firstTryCorrect: 1,
			lastSessionIndex: 0,
		};
	}
	return next;
}

describe("longitud y presentaciones", () => {
	it("devuelve exactamente la cantidad de ejercicios pedida", () => {
		expect(plan(emptyProgressState(), "phase1:vowel-a", 5)).toHaveLength(5);
		expect(plan(emptyProgressState(), "phase1:vowel-a", 6)).toHaveLength(6);
	});

	it("en una unidad nueva presenta como máximo 2 ítems", () => {
		const presentaciones = plan(emptyProgressState(), "phase2:m").filter(
			(e) => e.kind === "presentation",
		);
		expect(presentaciones.length).toBeLessThanOrEqual(MAX_PRESENTATIONS);
		expect(presentaciones.length).toBeGreaterThan(0);
	});

	it("solo presenta ítems que no se han presentado antes", () => {
		const sinPresentaciones = plan(
			presented("phase1:vowel-a"),
			"phase1:vowel-a",
		);
		expect(
			sinPresentaciones.filter((e) => e.kind === "presentation"),
		).toHaveLength(0);
	});

	it("las presentaciones van al principio", () => {
		const sesion = plan(emptyProgressState(), "phase2:m");
		const indices = sesion.flatMap((e, i) =>
			e.kind === "presentation" ? [i] : [],
		);
		for (const [posicion, indice] of indices.entries())
			expect(indice).toBe(posicion);
	});
});

describe("mezcla de unidad activa y repaso", () => {
	it("sin nada vencido, todo sale de la unidad activa", () => {
		const sesion = plan(presented("phase1:vowel-a"), "phase1:vowel-a");
		expect(sesion.every((e) => e.source === "active-unit")).toBe(true);
	});

	it("con ítems vencidos de unidades anteriores, reserva alrededor del 30 por ciento", () => {
		let state = presented("phase1:vowel-a");
		state = presented("phase1:vowel-e", state);
		state = { ...state, sessionCounter: 10 };
		const sesion = plan(state, "phase1:vowel-e", 6);
		const repaso = sesion.filter((e) => e.source === "review");
		expect(repaso.length).toBeGreaterThanOrEqual(1);
		expect(repaso.length).toBeLessThanOrEqual(2);
	});

	it("un ítem presentado y nunca acertado no queda abandonado al completarse su unidad", () => {
		// Una unidad se completa con el 80 %, así que un ítem puede quedarse sin dominar.
		// Si además nunca se acertó, su caja es 0 e isDue lo excluye del repaso. Este test
		// fija que el planificador lo recupera igualmente.
		let state = presented("phase1:vowel-a");
		const huerfano =
			curriculum.units.get("phase1:vowel-a")?.introduces[0] ?? "";
		state = {
			...state,
			items: {
				...state.items,
				[huerfano]: {
					...emptyItemProgress(),
					presented: true,
					box: 0,
					lastSessionIndex: 0,
				},
			},
			sessionCounter: 10,
		};
		const sesion = plan(state, "phase1:vowel-e", 6);
		expect(sesion.some((e) => e.itemId === huerfano)).toBe(true);
	});

	it("el repaso nunca trae ítems de la unidad activa", () => {
		let state = presented("phase1:vowel-a");
		state = presented("phase1:vowel-e", state);
		state = { ...state, sessionCounter: 10 };
		const activa = curriculum.units.get("phase1:vowel-e")?.introduces ?? [];
		for (const ejercicio of plan(state, "phase1:vowel-e", 6).filter(
			(e) => e.source === "review",
		)) {
			expect(activa).not.toContain(ejercicio.itemId);
		}
	});
});

describe("determinismo", () => {
	it("la misma semilla da la misma sesión", () => {
		const a = plan(presented("phase2:m"), "phase2:m", 6, 99);
		const b = plan(presented("phase2:m"), "phase2:m", 6, 99);
		expect(a).toEqual(b);
	});

	it("semillas distintas producen sesiones distintas al menos alguna vez", () => {
		const firmas = new Set(
			[1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
				plan(presented("phase2:m"), "phase2:m", 6, seed)
					.map((e) => `${e.templateId}:${e.itemId}`)
					.join("|"),
			),
		);
		expect(firmas.size).toBeGreaterThan(1);
	});
});

describe("orden de los ejercicios", () => {
	it("planifica la unidad de sí o no sin quedarse sin opciones", () => {
		const sesion = plan(presented("phase0:hear-it"), "phase0:hear-it", 5);
		expect(sesion).toHaveLength(5);
		for (const ejercicio of sesion) {
			expect(ejercicio.templateId).toBe("hear-it");
			expect(ejercicio.optionIds).toEqual([]);
			expect(ejercicio.correctOptionId).toBeNull();
		}
	});

	// La regla de no repetir plantilla se aplica solo entre evaluaciones: el salto de la última
	// presentación a la primera evaluación no se comprueba, porque una presentación no es un ejercicio.
	it("no coloca dos veces la misma plantilla seguidas", () => {
		for (const seed of [1, 2, 3, 4, 5]) {
			const sesion = plan(presented("phase2:m"), "phase2:m", 6, seed);
			const evaluaciones = sesion.filter((e) => e.kind === "evaluation");
			for (let i = 1; i < evaluaciones.length; i += 1) {
				expect(evaluaciones[i]?.templateId).not.toBe(
					evaluaciones[i - 1]?.templateId,
				);
			}
		}
	});

	it("cierra con la evaluación más fácil de la sesión", () => {
		const sesion = plan(presented("phase2:m"), "phase2:m", 6, 3);
		const evaluaciones = sesion.filter((e) => e.kind === "evaluation");
		const ultima = evaluaciones.at(-1);
		const minima = Math.min(
			...evaluaciones.map((e) => templates[e.templateId].difficulty),
		);
		if (ultima === undefined) throw new Error("sin evaluaciones");
		expect(templates[ultima.templateId].difficulty).toBe(minima);
	});

	it("cada ejercicio tiene un id único en la sesión", () => {
		const sesion = plan(presented("phase2:m"), "phase2:m", 6);
		expect(new Set(sesion.map((e) => e.id)).size).toBe(sesion.length);
	});
});

describe("el plan siempre es coherente, sobre muchas semillas y estados", () => {
	it("30 semillas por 3 estados: longitud correcta y todo ejercicio utilizable", () => {
		// El planificador es el módulo con más probabilidad de reventar en producción, porque
		// combina currículo, progreso, plantillas y distractores. Esta propiedad comprueba que
		// en ninguna combinación produce un plan que la interfaz no pueda dibujar.
		const estados: [string, ProgressState][] = [
			["recién empezado", emptyProgressState()],
			["unidad presentada", presented("phase1:vowel-a")],
			[
				"con repaso pendiente",
				{ ...presented("phase1:vowel-a"), sessionCounter: 12 },
			],
		];
		for (const [etiqueta, state] of estados) {
			for (const unitId of ["phase0:clap", "phase1:vowel-a", "phase2:m"]) {
				for (let seed = 1; seed <= 30; seed += 1) {
					for (const length of [5, 6] as const) {
						const sesion = planSession({
							content: curriculum,
							state,
							activeUnitId: unitId,
							sessionLength: length,
							seed,
						});
						expect([etiqueta, unitId, seed, sesion.length]).toEqual([
							etiqueta,
							unitId,
							seed,
							length,
						]);
						for (const ejercicio of sesion) {
							const item = curriculum.items.get(ejercicio.itemId);
							expect([etiqueta, ejercicio.itemId, item !== undefined]).toEqual([
								etiqueta,
								ejercicio.itemId,
								true,
							]);
							expect(templates[ejercicio.templateId].itemKinds).toContain(
								item?.kind,
							);
							if (ejercicio.kind === "presentation") {
								// Una presentación no ofrece opciones: el niño solo mira y escucha.
								expect([ejercicio.id, ejercicio.optionIds]).toEqual([
									ejercicio.id,
									[],
								]);
								expect([ejercicio.id, ejercicio.correctOptionId]).toEqual([
									ejercicio.id,
									null,
								]);
								continue;
							}
							const rango = templates[ejercicio.templateId].options;
							if (rango === undefined) {
								expect([ejercicio.id, ejercicio.optionIds]).toEqual([
									ejercicio.id,
									[],
								]);
							} else {
								expect(ejercicio.optionIds).toContain(
									ejercicio.correctOptionId,
								);
								expect([
									ejercicio.id,
									new Set(ejercicio.optionIds).size,
								]).toEqual([ejercicio.id, ejercicio.optionIds.length]);
							}
						}
					}
				}
			}
		}
	});

	it("cierra con el ejercicio más fácil en todas las semillas, no solo en una", () => {
		for (let seed = 1; seed <= 20; seed += 1) {
			const evaluaciones = plan(
				presented("phase2:m"),
				"phase2:m",
				6,
				seed,
			).filter((e) => e.kind === "evaluation");
			const minima = Math.min(
				...evaluaciones.map((e) => templates[e.templateId].difficulty),
			);
			const ultima = evaluaciones.at(-1);
			if (ultima === undefined) throw new Error("sin evaluaciones");
			expect([seed, templates[ultima.templateId].difficulty]).toEqual([
				seed,
				minima,
			]);
		}
	});

	it("el repaso saca primero los ítems de la caja más baja", () => {
		// La caja baja significa "se falló hace poco": es lo que más necesita volver.
		let state = presented("phase1:vowel-a");
		const ids = curriculum.units.get("phase1:vowel-a")?.introduces ?? [];
		state = {
			...state,
			items: {
				...state.items,
				[ids[0] ?? ""]: {
					...emptyItemProgress(),
					presented: true,
					box: 3,
					lastSessionIndex: 0,
				},
				[ids[1] ?? ""]: {
					...emptyItemProgress(),
					presented: true,
					box: 1,
					lastSessionIndex: 0,
				},
			},
			sessionCounter: 20,
		};
		const repaso = plan(state, "phase1:vowel-e", 6).filter(
			(e) => e.source === "review",
		);
		expect(repaso.length).toBeGreaterThan(0);
		expect(repaso[0]?.itemId).toBe(ids[1]);
	});
});

describe("plantillas y opciones", () => {
	it("cada ejercicio usa una plantilla que acepta la clase del ítem", () => {
		for (const unitId of [
			"phase0:clap",
			"phase0:rhyme",
			"phase0:initial",
			"phase0:hear-it",
			"phase1:vowel-a",
			"phase2:m",
		]) {
			for (const ejercicio of plan(presented(unitId), unitId, 6)) {
				const item = curriculum.items.get(ejercicio.itemId);
				expect(templates[ejercicio.templateId].itemKinds).toContain(item?.kind);
			}
		}
	});

	it("las plantillas con opciones traen la correcta entre ellas y sin repetidos", () => {
		for (const ejercicio of plan(presented("phase2:m"), "phase2:m", 6)) {
			if (templates[ejercicio.templateId].options === undefined) continue;
			expect(ejercicio.correctOptionId).not.toBeNull();
			expect(ejercicio.optionIds).toContain(ejercicio.correctOptionId);
			expect(new Set(ejercicio.optionIds).size).toBe(
				ejercicio.optionIds.length,
			);
		}
	});

	it("las plantillas sin opciones no traen ninguna", () => {
		for (const ejercicio of plan(presented("phase2:m"), "phase2:m", 6)) {
			if (templates[ejercicio.templateId].options !== undefined) continue;
			expect(ejercicio.optionIds).toEqual([]);
			expect(ejercicio.correctOptionId).toBeNull();
		}
	});

	it("la cantidad de opciones respeta el rango de la plantilla", () => {
		for (const ejercicio of plan(presented("phase2:m"), "phase2:m", 6)) {
			const rango = templates[ejercicio.templateId].options;
			if (rango === undefined) continue;
			expect(ejercicio.optionIds.length).toBeGreaterThanOrEqual(rango.min);
			expect(ejercicio.optionIds.length).toBeLessThanOrEqual(rango.max);
		}
	});

	it("usa las opciones que trae el dato cuando existen, como en rimas", () => {
		const sesion = plan(presented("phase0:rhyme"), "phase0:rhyme", 5);
		const rima = sesion.find((e) => e.templateId === "rhyme");
		const item = curriculum.items.get(rima?.itemId ?? "");
		expect(rima?.correctOptionId).toBe(item?.task?.answer);
		expect(rima?.optionIds.sort()).toEqual(
			[...(item?.task?.optionIds ?? [])].sort(),
		);
	});
});
