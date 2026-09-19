import { describe, expect, it } from "vitest";
import { buildCurriculum, curriculum } from "@/content/index";
import { templates } from "@/content/templates";
import { MAX_PRESENTATIONS, owningUnits, planSession } from "@/engine/planner";
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

/** Todo el currículo dominado: el niño se lo sabe todo, incluidas las unidades vacías. */
function todoDominado(): ProgressState {
	const state = emptyProgressState();
	for (const id of curriculum.items.keys()) {
		state.items[id] = {
			...emptyItemProgress(),
			presented: true,
			box: 3,
			firstTryCorrect: 3,
			lastSessionIndex: 0,
		};
	}
	return state;
}

/** Las unidades que se pueden jugar: las que introducen algún ítem. */
const jugables = curriculum.unitOrder.filter(
	(id) => (curriculum.units.get(id)?.introduces.length ?? 0) > 0,
);

/** Las unidades vacías de la Fase 3, que existen solo para dibujar el camino futuro. */
const vacias = curriculum.unitOrder.filter(
	(id) => (curriculum.units.get(id)?.introduces.length ?? 0) === 0,
);

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
		// Se comprueba también contra el literal: contrastar solo con la constante importada
		// es tautológico y no detectaría que alguien la suba. El máximo de 2 viene de que a
		// los 3 años la atención no da para más ítems nuevos en una misma sesión.
		expect(MAX_PRESENTATIONS).toBe(2);
		expect(presentaciones.length).toBeLessThanOrEqual(2);
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

	it("la sesión SIEMPRE cierra con el ejercicio más fácil, en todas las unidades jugables", () => {
		// Barrido amplio a propósito: la garantía se conserva por construcción, porque la
		// pasada de mejora nunca escribe en la última posición. Si alguien rompiera ese
		// límite, un test sobre tres unidades y cinco semillas no lo detectaría de forma
		// fiable; este sí.
		expect(jugables.length).toBeGreaterThanOrEqual(13);
		for (const unitId of jugables) {
			for (const length of [5, 6] as const) {
				for (let seed = 1; seed <= 20; seed += 1) {
					const evaluaciones = plan(
						presented(unitId),
						unitId,
						length,
						seed,
					).filter((e) => e.kind === "evaluation");
					if (evaluaciones.length === 0) continue;
					const minima = Math.min(
						...evaluaciones.map((e) => templates[e.templateId].difficulty),
					);
					const ultima = evaluaciones.at(-1);
					if (ultima === undefined) throw new Error("sin evaluaciones");
					expect([
						unitId,
						length,
						seed,
						templates[ultima.templateId].difficulty,
					]).toEqual([unitId, length, seed, minima]);
				}
			}
		}
	});

	it("evita repetir plantilla seguida donde es posible, y lo documenta donde no", () => {
		// Las cuatro unidades jugables de la Fase 0 declaran una sola plantilla cada una, así
		// que el 100 % de sus evaluaciones son del mismo tipo y la regla es inalcanzable por
		// diseño del contenido: la variedad de esas sesiones viene de las palabras, no del
		// tipo de ejercicio. Donde hay más de una plantilla aplicable, se exige como mucho un
		// par repetido.
		let conVariasPlantillas = 0;
		for (const unitId of jugables) {
			for (const length of [5, 6] as const) {
				for (let seed = 1; seed <= 20; seed += 1) {
					const evaluaciones = plan(
						presented(unitId),
						unitId,
						length,
						seed,
					).filter((e) => e.kind === "evaluation");
					const distintas = new Set(evaluaciones.map((e) => e.templateId)).size;
					if (distintas <= 1) continue;
					conVariasPlantillas += 1;
					let pares = 0;
					for (let i = 1; i < evaluaciones.length; i += 1) {
						if (evaluaciones[i]?.templateId === evaluaciones[i - 1]?.templateId)
							pares += 1;
					}
					expect([unitId, length, seed, pares <= 1]).toEqual([
						unitId,
						length,
						seed,
						true,
					]);
				}
			}
		}
		expect(conVariasPlantillas).toBeGreaterThan(100);
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
			// El estado que faltaba: el niño que se lo sabe todo. Con él, el motor daba por
			// completadas las 8 unidades vacías de la Fase 3 y el planificador acababa
			// recibiendo una unidad sin ítems. Ningún test pasaba antes por aquí.
			["todo dominado", todoDominado()],
		];
		for (const [etiqueta, state] of estados) {
			for (const unitId of jugables) {
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

	it("rechaza planificar una unidad que no introduce nada, en vez de inventarse una sesión", () => {
		// Con una unidad vacía el planificador devolvía ítems repetidos, ejercicios de repaso
		// etiquetados como de la unidad activa y, con todo dominado, ninguna sesión.
		expect(vacias.length).toBeGreaterThan(0);
		for (const unitId of vacias) {
			for (const state of [emptyProgressState(), todoDominado()]) {
				expect(() => plan(state, unitId, 6)).toThrow(
					/no introduce ningún ítem/i,
				);
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

describe("las opciones solo traen contenido que el niño ya ha visto", () => {
	const indiceDeUnidad = new Map(
		curriculum.unitOrder.map((id, i) => [id, i] as const),
	);
	const dueños = owningUnits(curriculum);

	/**
	 * La única excepción permitida, y sale de la propia spec §4: "nivel fácil = formas muy
	 * distintas (a vs i vs u); nivel medio = vocales restantes". En phase1:vowel-a el niño
	 * solo ha visto la a, y en vowel-e la a y la e, así que no hay con qué llenar las 2 o 3
	 * opciones de listen-tap sin las vocales que aún no tocan. Ninguna otra cosa puede
	 * colarse: ni una consonante de la Fase 2, ni una palabra de cuatro letras.
	 */
	const EXCEPCIONES: Record<string, string[]> = {
		"phase1:vowel-a": ["letter:e", "letter:i", "letter:o", "letter:u"],
		"phase1:vowel-e": ["letter:i", "letter:o", "letter:u"],
	};

	it("cuando ni la fase alcanza, tira del currículo entero antes que dejar al niño sin ejercicio", () => {
		// Red de seguridad para contenido futuro: aquí la única unidad enseña la a y no hay
		// ninguna otra unidad de su fase, así que las dos opciones de listen-tap solo pueden
		// salir de un ítem que no introduce ninguna unidad. Es preferible una opción lejana a
		// cortarle la sesión al niño con un error.
		const contenido = buildCurriculum({
			items: ["a", "z"].map((letra) => ({
				id: `letter:${letra}`,
				kind: "letter" as const,
				text: letra,
				phonemes: [letra],
				audioKey: `phoneme:${letra}`,
				display: { upper: letra.toUpperCase(), lower: letra },
			})),
			units: [
				{
					id: "sola",
					phase: 1 as const,
					title: "Sola",
					audioKey: "unit:sola",
					requires: [],
					introduces: ["letter:a"],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
			],
		});
		const sesion = planSession({
			content: contenido,
			state: emptyProgressState(),
			activeUnitId: "sola",
			sessionLength: 5,
			seed: 1,
		});
		const conOpciones = sesion.filter((e) => e.optionIds.length > 0);
		expect(conOpciones.length).toBeGreaterThan(0);
		for (const ejercicio of conOpciones) {
			expect(ejercicio.optionIds).toContain("letter:z");
		}
	});

	it("ninguna opción sale de una unidad posterior a la activa", () => {
		// Lo medido antes de arreglarlo, en phase1:vowel-a: con nivel difícil aparecía letter:s,
		// que no se enseña hasta doce unidades después, y con nivel fácil word:amo y word:masa,
		// palabras de cuatro letras hechas con consonantes que el niño no conoce.
		let revisadas = 0;
		let excepciones = 0;
		for (const unitId of jugables) {
			const indiceActivo = indiceDeUnidad.get(unitId) ?? -1;
			// Los dos estados dan los dos niveles de distractor: sin ningún acierto, fácil (el
			// mínimo de opciones); con un acierto, difícil (el máximo).
			for (const state of [emptyProgressState(), presented(unitId)]) {
				for (const length of [5, 6] as const) {
					for (let seed = 1; seed <= 30; seed += 1) {
						for (const ejercicio of plan(state, unitId, length, seed)) {
							for (const optionId of ejercicio.optionIds) {
								const item = curriculum.items.get(optionId);
								// Las imágenes quedan fuera: el niño las mira y las oye, no las lee.
								if (item === undefined || item.kind === "picture") continue;
								revisadas += 1;
								const dueño = dueños.get(optionId);
								const indiceOpcion =
									dueño === undefined
										? Number.POSITIVE_INFINITY
										: (indiceDeUnidad.get(dueño) ?? Number.POSITIVE_INFINITY);
								if (indiceOpcion <= indiceActivo) continue;
								excepciones += 1;
								const permitida = (EXCEPCIONES[unitId] ?? []).includes(
									optionId,
								);
								expect([unitId, optionId, permitida]).toEqual([
									unitId,
									optionId,
									true,
								]);
							}
						}
					}
				}
			}
		}
		// Un barrido que no mirara casi nada pasaría por vacío.
		expect(revisadas).toBeGreaterThan(3000);
		// Y si las excepciones dejaran de hacer falta, este permiso estaría tapando un hueco.
		expect(excepciones).toBeGreaterThan(0);
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
