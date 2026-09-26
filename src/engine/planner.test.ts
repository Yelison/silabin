import { describe, expect, it } from "vitest";
import {
	buildCurriculum,
	type CurriculumIndex,
	curriculum,
} from "@/content/index";
import { templates } from "@/content/templates";
import { applyResolution, applySessionEnd } from "@/engine/apply";
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

	it("de la unidad activa entran primero los ítems menos dominados", () => {
		// Paso 2 del algoritmo de la spec §5: "~70 % de los ejercicios evalúan ítems de la
		// unidad activa, priorizando los menos dominados". phase2:m introduce 12 ítems y en una
		// sesión de 5 solo caben 5: sin ese orden entrarían ítems ya sabidos en lugar de los
		// que al niño le cuestan, que es justo para lo que va a la sesión.
		const unitId = "phase2:m";
		const introduce = curriculum.units.get(unitId)?.introduces ?? [];
		expect(introduce.length).toBeGreaterThan(5);
		const flojos = introduce.slice(-5);
		const state = emptyProgressState();
		for (const id of introduce) {
			state.items[id] = {
				...emptyItemProgress(),
				presented: true,
				box: 1,
				firstTryCorrect: flojos.includes(id) ? 0 : 5,
				lastSessionIndex: 0,
			};
		}
		for (let seed = 1; seed <= 20; seed += 1) {
			const evaluados = plan(state, unitId, 5, seed)
				.map((e) => e.itemId)
				.sort();
			expect([seed, evaluados]).toEqual([seed, [...flojos].sort()]);
		}
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

	it("la mejora del orden se nota en el total, no solo dentro de cada sesión", () => {
		// El test de arriba acota los pares por sesión (como mucho uno), y esa cota la cumple ya
		// la pasada de mejora ella sola: quitar arrangeNoAdjacent no sube el máximo por sesión,
		// que sigue siendo 1. Lo que empeora es el total. Medido sobre este mismo barrido —las
		// 13 unidades jugables por 2 longitudes por 100 semillas, 1800 sesiones con más de una
		// plantilla—: 201 pares repetidos con arrangeNoAdjacent y 477 sin él, más del doble. El
		// techo de 300 deja la mitad de margen por encima de lo medido y rechaza de sobra esa
		// regresión. Es una cota agregada a propósito: la de por sesión no puede verla.
		const TECHO = 300;
		let pares = 0;
		let multiplantilla = 0;
		for (const unitId of jugables) {
			for (const length of [5, 6] as const) {
				for (let seed = 1; seed <= 100; seed += 1) {
					const evaluaciones = plan(
						presented(unitId),
						unitId,
						length,
						seed,
					).filter((e) => e.kind === "evaluation");
					// Las unidades de la Fase 0 declaran una sola plantilla: ahí repetir es inevitable
					// por diseño del contenido y contarlas ahogaría la señal.
					if (new Set(evaluaciones.map((e) => e.templateId)).size <= 1)
						continue;
					multiplantilla += 1;
					for (let i = 1; i < evaluaciones.length; i += 1) {
						if (evaluaciones[i]?.templateId === evaluaciones[i - 1]?.templateId)
							pares += 1;
					}
				}
			}
		}
		// Un barrido que mirara cuatro sesiones cumpliría cualquier techo.
		expect(multiplantilla).toBeGreaterThan(1500);
		expect(pares).toBeLessThanOrEqual(TECHO);
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
							if (rango === undefined && ejercicio.templateId !== "build") {
								expect([ejercicio.id, ejercicio.optionIds]).toEqual([
									ejercicio.id,
									[],
								]);
							} else if (ejercicio.templateId === "build") {
								// build arma sus piezas aparte: sin rango declarado ni respuesta
								// correcta marcada, pero sin piezas repetidas.
								expect(ejercicio.correctOptionId).toBeNull();
								expect([
									ejercicio.id,
									new Set(ejercicio.optionIds).size,
								]).toEqual([ejercicio.id, ejercicio.optionIds.length]);
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

	it("los distractores empiezan fáciles y se ponen difíciles cuando el ítem ya se acertó", () => {
		// Spec §4: "primero formas muy distintas, luego parecidas". El nivel se decide por los
		// aciertos al primer intento del ítem, y se nota en el número de opciones: el fácil usa
		// el mínimo de la plantilla y el difícil el máximo. Si el ternario se invirtiera, el
		// niño estrenaría cada ítem por lo más difícil y lo repasaría por lo más fácil.
		let faciles = 0;
		let dificiles = 0;
		for (let seed = 1; seed <= 10; seed += 1) {
			// Sin un solo acierto: nivel fácil.
			for (const ejercicio of plan(emptyProgressState(), "phase2:m", 6, seed)) {
				const rango = templates[ejercicio.templateId].options;
				if (rango === undefined || ejercicio.kind !== "evaluation") continue;
				faciles += 1;
				expect([seed, ejercicio.itemId, ejercicio.optionIds.length]).toEqual([
					seed,
					ejercicio.itemId,
					rango.min,
				]);
			}
			// Con un acierto al primer intento, que es justo el umbral: nivel difícil.
			for (const ejercicio of plan(
				presented("phase2:m"),
				"phase2:m",
				6,
				seed,
			)) {
				const rango = templates[ejercicio.templateId].options;
				if (rango === undefined || ejercicio.kind !== "evaluation") continue;
				dificiles += 1;
				expect([seed, ejercicio.itemId, ejercicio.optionIds.length]).toEqual([
					seed,
					ejercicio.itemId,
					rango.max,
				]);
			}
		}
		expect(faciles).toBeGreaterThan(0);
		expect(dificiles).toBeGreaterThan(0);
	});

	it("las plantillas sin opciones no traen ninguna, salvo build, que arma sus piezas aparte", () => {
		for (const ejercicio of plan(presented("phase2:m"), "phase2:m", 6)) {
			if (templates[ejercicio.templateId].options !== undefined) continue;
			if (ejercicio.templateId === "build") continue;
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

describe("sin respaldo global de plantillas", () => {
	it("T1.3: una unidad que no declara plantilla para su ítem lanza con los ids de la unidad y del ítem", () => {
		const contenido = buildCurriculum({
			items: [
				{
					id: "oral:clap:sol",
					kind: "oral-skill",
					text: "sol",
					phonemes: [],
					audioKey: "word:sol",
					task: { answer: "1" },
				},
			],
			units: [
				{
					id: "solo-listen-tap",
					phase: 0,
					title: "Solo listen-tap",
					audioKey: "unit:solo-listen-tap",
					requires: [],
					introduces: ["oral:clap:sol"],
					exercises: [{ templateId: "listen-tap", weight: 1 }],
				},
			],
		});
		expect(() =>
			planSession({
				content: contenido,
				state: emptyProgressState(),
				activeUnitId: "solo-listen-tap",
				sessionLength: 5,
				seed: 1,
			}),
		).toThrow(
			"La unidad solo-listen-tap no declara ninguna plantilla para el ítem oral:clap:sol (oral-skill)",
		);
	});

	it("T1.4: en phase2:m los ejercicios de phoneme:m usan initial-sound", () => {
		const delFonema = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
			plan(presented("phase2:m"), "phase2:m", 6, seed).filter(
				(e) => e.itemId === "phoneme:m",
			),
		);
		expect(delFonema.length).toBeGreaterThan(0);
		for (const ejercicio of delFonema) {
			expect(ejercicio.templateId).toBe("initial-sound");
		}
	});
});

describe("sesión de solo repaso (activeUnitId null)", () => {
	const NOW = "2026-09-26T12:00:00.000Z";

	/** Domina todo el currículo por el camino real: tres sesiones con crédito por ítem. */
	function dominadoConApply(): ProgressState {
		let state = emptyProgressState();
		for (let sesion = 0; sesion < 3; sesion += 1) {
			for (const itemId of curriculum.items.keys()) {
				state = applyResolution({
					content: curriculum,
					state,
					itemId,
					templateId: "listen-tap",
					resolution: { status: "mastery-credit" },
					sessionIndex: sesion,
					now: NOW,
				});
			}
			state = applySessionEnd({
				content: curriculum,
				state,
				unitId: null,
				stars: 3,
			});
		}
		return state;
	}

	function repaso(state: ProgressState, length: 5 | 6 = 5, seed = 1) {
		return planSession({
			content: curriculum,
			state,
			activeUnitId: null,
			sessionLength: length,
			seed,
		});
	}

	/** Todo presentado en caja 3 y vencido, para que solo el orden por caja decida. */
	function todoVencido(): ProgressState {
		const state = todoDominado();
		state.sessionCounter = 100;
		return state;
	}

	it("T2.1: con todo dominado, devuelve la longitud pedida, todo evaluación y repaso", () => {
		const state = dominadoConApply();
		expect(
			curriculum.unitOrder.every(
				(id) =>
					(curriculum.units.get(id)?.introduces.length ?? 0) === 0 ||
					state.units[id]?.status === "done",
			),
		).toBe(true);
		for (const length of [5, 6] as const) {
			const sesion = repaso(state, length);
			expect(sesion).toHaveLength(length);
			for (const ejercicio of sesion) {
				expect(ejercicio.kind).toBe("evaluation");
				expect(ejercicio.source).toBe("review");
			}
			expect(new Set(sesion.map((e) => e.id)).size).toBe(length);
		}
	});

	it("T2.1: usa la plantilla de la unidad dueña del ítem y trae opciones coherentes", () => {
		const owners = owningUnits(curriculum);
		for (let seed = 1; seed <= 10; seed += 1) {
			for (const ejercicio of repaso(dominadoConApply(), 6, seed)) {
				const dueña = curriculum.units.get(owners.get(ejercicio.itemId) ?? "");
				const declaradas = dueña?.exercises.map((e) => e.templateId) ?? [];
				expect(declaradas).toContain(ejercicio.templateId);
				if (ejercicio.correctOptionId !== null) {
					expect(ejercicio.optionIds).toContain(ejercicio.correctOptionId);
				}
			}
		}
	});

	it("T2.2: un ítem en caja 1 entre otros en caja 3 aparece en la sesión", () => {
		const state = dominadoConApply();
		const debil = "letter:m";
		state.items[debil] = {
			...emptyItemProgress(),
			presented: true,
			box: 1,
			firstTryCorrect: 1,
			lastSessionIndex: 2,
		};
		for (let seed = 1; seed <= 10; seed += 1) {
			expect(repaso(state, 5, seed).map((e) => e.itemId)).toContain(debil);
		}
	});

	it("los ítems de caja más baja van antes que los de caja más alta cuando todo está vencido", () => {
		const state = todoVencido();
		const baja = ["letter:m", "syllable:ma"];
		for (const id of baja) {
			state.items[id] = { ...emptyItemProgress(), presented: true, box: 1 };
		}
		state.items["word:mapa"] = {
			...emptyItemProgress(),
			presented: true,
			box: 2,
		};
		// Los tres primeros por (caja, sesión, id) son estos; los dos huecos restantes los
		// llenan los de caja 3 con el id menor.
		const restantes = [...curriculum.items.keys()]
			.filter((id) => !baja.includes(id) && id !== "word:mapa")
			.sort((a, b) => a.localeCompare(b))
			.slice(0, 2);
		const esperado = [...baja, "word:mapa", ...restantes].sort();
		for (let seed = 1; seed <= 5; seed += 1) {
			expect(
				repaso(state, 5, seed)
					.map((e) => e.itemId)
					.sort(),
			).toEqual(esperado);
		}
	});

	it("los vencidos van antes que los que aún no les toca, aunque tengan caja más alta", () => {
		// Todo en caja 1 y presentado en la sesión 1, con el contador en 1: nada está vencido
		// (1 - 1 < 1). Solo "vencidos primero" puede meter en la sesión al de caja 3, que por
		// caja sería el último de más de sessionLength candidatos.
		const state = emptyProgressState();
		state.sessionCounter = 1;
		for (const id of curriculum.items.keys()) {
			state.items[id] = {
				...emptyItemProgress(),
				presented: true,
				box: 1,
				firstTryCorrect: 1,
				lastSessionIndex: 1,
			};
		}
		// Ordenado por id sería el último: ni caja, ni antigüedad, ni id lo favorecen.
		const vencido = [...curriculum.items.keys()].sort((a, b) =>
			b.localeCompare(a),
		)[0];
		if (vencido === undefined) throw new Error("currículo vacío");
		state.items[vencido] = {
			...emptyItemProgress(),
			presented: true,
			box: 3,
			firstTryCorrect: 3,
			lastSessionIndex: -10,
		};
		expect(curriculum.items.size).toBeGreaterThan(5);
		for (let seed = 1; seed <= 5; seed += 1) {
			expect(repaso(state, 5, seed).map((e) => e.itemId)).toContain(vencido);
		}
	});

	it("a igual caja, sale antes el ítem de sesión más antigua", () => {
		// Todo vencido y en la misma caja: solo lastSessionIndex ascendente puede meter en la
		// sesión al más antiguo, que por id sería el último de más de sessionLength candidatos.
		const state = todoVencido();
		for (const id of curriculum.items.keys()) {
			state.items[id] = {
				...emptyItemProgress(),
				presented: true,
				box: 2,
				firstTryCorrect: 2,
				lastSessionIndex: 50,
			};
		}
		const antiguo = [...curriculum.items.keys()].sort((a, b) =>
			b.localeCompare(a),
		)[0];
		if (antiguo === undefined) throw new Error("currículo vacío");
		state.items[antiguo] = {
			...emptyItemProgress(),
			presented: true,
			box: 2,
			firstTryCorrect: 2,
			lastSessionIndex: 10,
		};
		expect(curriculum.items.size).toBeGreaterThan(5);
		for (let seed = 1; seed <= 5; seed += 1) {
			expect(repaso(state, 5, seed).map((e) => e.itemId)).toContain(antiguo);
		}
	});

	it("solo repasa ítems presentados", () => {
		const state = presented("phase2:m");
		const vistos = new Set(
			Object.entries(state.items)
				.filter(([, p]) => p.presented)
				.map(([id]) => id),
		);
		expect(vistos.size).toBeGreaterThan(0);
		expect(vistos.size).toBeLessThan(curriculum.items.size);
		for (let seed = 1; seed <= 10; seed += 1) {
			for (const ejercicio of repaso(state, 6, seed)) {
				expect(vistos.has(ejercicio.itemId)).toBe(true);
			}
		}
	});

	it("con menos candidatos que huecos, cicla sobre ellos", () => {
		const state = emptyProgressState();
		state.items["letter:m"] = {
			...emptyItemProgress(),
			presented: true,
			box: 1,
			lastSessionIndex: 0,
		};
		const sesion = repaso(state, 5);
		expect(sesion).toHaveLength(5);
		expect(new Set(sesion.map((e) => e.itemId))).toEqual(new Set(["letter:m"]));
	});

	it("T2.3: misma semilla, mismo resultado; otra semilla, algo distinto", () => {
		const state = dominadoConApply();
		expect(repaso(state, 6, 42)).toEqual(repaso(state, 6, 42));
		const firmas = new Set(
			[1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
				repaso(state, 6, seed)
					.map((e) => `${e.templateId}:${e.itemId}:${e.optionIds.join(",")}`)
					.join("|"),
			),
		);
		expect(firmas.size).toBeGreaterThan(1);
	});

	it("T2.4: cierra con la plantilla más fácil y casi nunca repite plantilla seguida", () => {
		let conVarias = 0;
		let pares = 0;
		let sesiones = 0;
		for (let seed = 1; seed <= 100; seed += 1) {
			for (const length of [5, 6] as const) {
				const sesion = repaso(todoVencido(), length, seed);
				const minima = Math.min(
					...sesion.map((e) => templates[e.templateId].difficulty),
				);
				const ultima = sesion.at(-1);
				if (ultima === undefined) throw new Error("sesión vacía");
				expect(templates[ultima.templateId].difficulty).toBe(minima);
				sesiones += 1;
				if (new Set(sesion.map((e) => e.templateId)).size > 1) conVarias += 1;
				let paresSesion = 0;
				for (let i = 1; i < sesion.length; i += 1) {
					if (sesion[i]?.templateId === sesion[i - 1]?.templateId)
						paresSesion += 1;
				}
				expect(paresSesion).toBeLessThanOrEqual(1);
				pares += paresSesion;
			}
		}
		expect(conVarias).toBeGreaterThan(0);
		expect(pares).toBeLessThan(sesiones);
	});

	it("T2.5: sin ningún ítem presentado lanza un aviso claro", () => {
		expect(() => repaso(emptyProgressState())).toThrow(
			"No hay nada que repasar: ningún ítem se ha presentado",
		);
	});

	it("una unidad activa desconocida sigue lanzando", () => {
		expect(() => plan(emptyProgressState(), "no-existe")).toThrow(
			/Unidad desconocida/,
		);
	});
});

describe("plantilla build: piezas para arrastrar", () => {
	function presentedIn(
		content: CurriculumIndex,
		unitId: string,
	): ProgressState {
		const unit = content.units.get(unitId);
		const state = emptyProgressState();
		for (const id of unit?.introduces ?? []) {
			state.items[id] = {
				...emptyItemProgress(),
				presented: true,
				box: 1,
				firstTryCorrect: 1,
				lastSessionIndex: 0,
			};
		}
		return state;
	}

	it("M6: en phase2:m, las piezas son las 5 vocales más letter:m, sin correcta marcada", () => {
		let vistos = 0;
		for (let seed = 1; seed <= 20; seed += 1) {
			for (const ejercicio of plan(
				presented("phase2:m"),
				"phase2:m",
				6,
				seed,
			)) {
				if (ejercicio.templateId !== "build") continue;
				vistos += 1;
				expect(ejercicio.correctOptionId).toBeNull();
				expect([...ejercicio.optionIds].sort()).toEqual(
					[
						"letter:a",
						"letter:e",
						"letter:i",
						"letter:m",
						"letter:o",
						"letter:u",
					].sort(),
				);
			}
		}
		expect(vistos).toBeGreaterThan(0);
	});

	it("mata la mutación 2: la propia consonante del ítem entra aunque no esté entre las vistas", () => {
		const contenido = buildCurriculum({
			items: [
				...["a", "e", "i", "o", "u"].map((v) => ({
					id: `letter:${v}`,
					kind: "letter" as const,
					text: v,
					phonemes: [v],
					audioKey: `phoneme:${v}`,
					display: { upper: v.toUpperCase(), lower: v },
				})),
				{
					id: "letter:z",
					kind: "letter" as const,
					text: "z",
					phonemes: ["z"],
					audioKey: "phoneme:z",
					display: { upper: "Z", lower: "z" },
				},
				{
					id: "syllable:za",
					kind: "syllable" as const,
					text: "za",
					phonemes: ["z", "a"],
					audioKey: "syllable:za",
				},
			],
			units: [
				{
					id: "vocales",
					phase: 1 as const,
					title: "Vocales",
					audioKey: "unit:vocales",
					requires: [],
					introduces: [
						"letter:a",
						"letter:e",
						"letter:i",
						"letter:o",
						"letter:u",
					],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "silaba-z",
					phase: 2 as const,
					title: "La z",
					audioKey: "unit:silaba-z",
					requires: ["vocales"],
					// Deliberado: esta unidad no introduce letter:z, así que nunca entra en
					// "seen". Solo la propia consonante del ítem debe entrar de todos modos.
					introduces: ["syllable:za"],
					exercises: [{ templateId: "build" as const, weight: 1 }],
				},
			],
		});
		const sesion = planSession({
			content: contenido,
			state: presentedIn(contenido, "silaba-z"),
			activeUnitId: "silaba-z",
			sessionLength: 5,
			seed: 1,
		});
		const construir = sesion.find(
			(e) => e.templateId === "build" && e.kind === "evaluation",
		);
		expect(construir).toBeDefined();
		expect(construir?.correctOptionId).toBeNull();
		expect([...(construir?.optionIds ?? [])].sort()).toEqual(
			[
				"letter:a",
				"letter:e",
				"letter:i",
				"letter:o",
				"letter:u",
				"letter:z",
			].sort(),
		);
	});

	it("nunca junta b, d, p o q entre las piezas (isForbiddenDistractor)", () => {
		const contenido = buildCurriculum({
			items: [
				...["a", "e", "i", "o", "u"].map((v) => ({
					id: `letter:${v}`,
					kind: "letter" as const,
					text: v,
					phonemes: [v],
					audioKey: `phoneme:${v}`,
					display: { upper: v.toUpperCase(), lower: v },
				})),
				{
					id: "letter:d",
					kind: "letter" as const,
					text: "d",
					phonemes: ["d"],
					audioKey: "phoneme:d",
					display: { upper: "D", lower: "d" },
				},
				{
					id: "letter:b",
					kind: "letter" as const,
					text: "b",
					phonemes: ["b"],
					audioKey: "phoneme:b",
					display: { upper: "B", lower: "b" },
				},
				{
					id: "syllable:ba",
					kind: "syllable" as const,
					text: "ba",
					phonemes: ["b", "a"],
					audioKey: "syllable:ba",
				},
			],
			units: [
				{
					id: "vocales",
					phase: 1 as const,
					title: "Vocales",
					audioKey: "unit:vocales",
					requires: [],
					introduces: [
						"letter:a",
						"letter:e",
						"letter:i",
						"letter:o",
						"letter:u",
					],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "silaba-d",
					phase: 2 as const,
					title: "La d",
					audioKey: "unit:silaba-d",
					requires: ["vocales"],
					introduces: ["letter:d"],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "silaba-b",
					phase: 2 as const,
					title: "La b",
					audioKey: "unit:silaba-b",
					requires: ["silaba-d"],
					introduces: ["syllable:ba"],
					exercises: [{ templateId: "build" as const, weight: 1 }],
				},
			],
		});
		const sesion = planSession({
			content: contenido,
			state: emptyProgressState(),
			activeUnitId: "silaba-b",
			sessionLength: 5,
			seed: 1,
		});
		const construir = sesion.find(
			(e) => e.templateId === "build" && e.kind === "evaluation",
		);
		expect(construir).toBeDefined();
		expect(construir?.optionIds).toContain("letter:b");
		expect(construir?.optionIds).not.toContain("letter:d");
	});

	it("dos consonantes vistas que chocan entre sí se excluyen aunque ninguna choque con la propia del ítem (ronda 1, hallazgo 1)", () => {
		// Aquí la propia consonante del ítem es "m", que no forma pareja prohibida ni con "b"
		// ni con "d". Si el choque solo se mirara contra la propia consonante (en vez de
		// contra todas las ya incluidas), "b" y "d" entrarían las dos. Por Ruling 2, entra la
		// primera en el orden de "seen" (b) y se descarta la segunda (d), que choca con ella.
		const contenido = buildCurriculum({
			items: [
				...["a", "e", "i", "o", "u"].map((v) => ({
					id: `letter:${v}`,
					kind: "letter" as const,
					text: v,
					phonemes: [v],
					audioKey: `phoneme:${v}`,
					display: { upper: v.toUpperCase(), lower: v },
				})),
				{
					id: "letter:b",
					kind: "letter" as const,
					text: "b",
					phonemes: ["b"],
					audioKey: "phoneme:b",
					display: { upper: "B", lower: "b" },
				},
				{
					id: "letter:d",
					kind: "letter" as const,
					text: "d",
					phonemes: ["d"],
					audioKey: "phoneme:d",
					display: { upper: "D", lower: "d" },
				},
				{
					id: "letter:m",
					kind: "letter" as const,
					text: "m",
					phonemes: ["m"],
					audioKey: "phoneme:m",
					display: { upper: "M", lower: "m" },
				},
				{
					id: "syllable:ma",
					kind: "syllable" as const,
					text: "ma",
					phonemes: ["m", "a"],
					audioKey: "syllable:ma",
				},
			],
			units: [
				{
					id: "vocales",
					phase: 1 as const,
					title: "Vocales",
					audioKey: "unit:vocales",
					requires: [],
					introduces: [
						"letter:a",
						"letter:e",
						"letter:i",
						"letter:o",
						"letter:u",
					],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "letra-b",
					phase: 2 as const,
					title: "La b",
					audioKey: "unit:letra-b",
					requires: ["vocales"],
					introduces: ["letter:b"],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "letra-d",
					phase: 2 as const,
					title: "La d",
					audioKey: "unit:letra-d",
					requires: ["letra-b"],
					introduces: ["letter:d"],
					exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
				},
				{
					id: "silaba-m",
					phase: 2 as const,
					title: "La m",
					audioKey: "unit:silaba-m",
					requires: ["letra-d"],
					// letter:m no entra por "seen" en ningún momento anterior: la propia
					// consonante del ítem se busca directamente, no a través de seenConsonants.
					introduces: ["syllable:ma"],
					exercises: [{ templateId: "build" as const, weight: 1 }],
				},
			],
		});
		const sesion = planSession({
			content: contenido,
			state: presentedIn(contenido, "silaba-m"),
			activeUnitId: "silaba-m",
			sessionLength: 5,
			seed: 1,
		});
		const construir = sesion.find(
			(e) => e.templateId === "build" && e.kind === "evaluation",
		);
		expect(construir).toBeDefined();
		expect(construir?.optionIds).toContain("letter:m");
		expect(construir?.optionIds).toContain("letter:b");
		expect(construir?.optionIds).not.toContain("letter:d");
	});
});
