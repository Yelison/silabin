import { describe, expect, it } from "vitest";
import { curriculum } from "@/content/index";
import { templates } from "@/content/templates";
import {
	activeUnitId,
	applyPresentation,
	applyResolution,
	applySessionEnd,
	createAttemptState,
	type ExerciseResolution,
	earnedRewardIds,
	emptyProgressState,
	isMastered,
	type ProgressState,
	planSession,
	recordAttempt,
	type Stars,
	starsForSession,
	totalStars,
	UNIT_COMPLETION_THRESHOLD,
	unitMasteryRatio,
} from "@/engine";

type Perfil = "siempre-acierta" | "falla-una-vez" | "siempre-falla";

/**
 * Un guion elige el perfil de cada sesión a partir de su número. Sirve para simular a un niño
 * cuyo rendimiento cambia con el tiempo sin perder determinismo: la decisión depende del índice
 * de sesión, nunca del azar del planificador, así que el mismo guion da siempre la misma partida.
 */
type Guion = (sesion: number) => Perfil;

/**
 * Acierta todo en las sesiones pares y falla todo en las impares. Como al fallar no se domina
 * nada, el niño se queda muchas sesiones en la misma unidad, que es justo lo que hace falta:
 * una unidad que recibe una sesión de 3 estrellas y luego una de 1, e ítems que ya tenían
 * dominio y vuelven a resolverse con el modelo.
 */
const alternaAciertoYFallo: Guion = (sesion) =>
	sesion % 2 === 0 ? "siempre-acierta" : "siempre-falla";

const NOW = "2026-09-18T12:00:00.000Z";

/** Resuelve un ejercicio recorriendo la escalera de pistas según el perfil. */
function resolveExercise(
	templateId: Parameters<typeof recordAttempt>[0],
	perfil: Perfil,
): ExerciseResolution {
	let state = createAttemptState();
	let intentos = 0;
	for (;;) {
		intentos += 1;
		const acierta =
			perfil === "siempre-acierta" ||
			(perfil === "falla-una-vez" && intentos >= 2);
		const step = recordAttempt(
			templateId,
			state,
			acierta ? "correct" : "wrong",
		);
		if (step.resolution !== null) return step.resolution;
		state = step.state;
	}
}

/** Lo que hace falta saber de una sesión para juzgar lo que el motor guardó de ella. */
type Sesion = {
	state: ProgressState;
	/** La unidad activa cuando empezó la sesión, que es la que recibe las estrellas. */
	unitId: string;
	stars: Stars;
};

function jugarSesion(
	state: ProgressState,
	perfil: Perfil | Guion,
	seed: number,
): Sesion {
	const unitId = activeUnitId(curriculum, state);
	const perfilDeHoy =
		typeof perfil === "function" ? perfil(state.sessionCounter) : perfil;
	const plan = planSession({
		content: curriculum,
		state,
		activeUnitId: unitId,
		sessionLength: 6,
		seed,
	});

	let next = state;
	const resolutions: ExerciseResolution[] = [];

	for (const exercise of plan) {
		if (exercise.kind === "presentation") {
			next = applyPresentation(next, exercise.itemId, next.sessionCounter);
			continue;
		}
		const resolution = resolveExercise(exercise.templateId, perfilDeHoy);
		resolutions.push(resolution);
		next = applyResolution({
			content: curriculum,
			state: next,
			itemId: exercise.itemId,
			templateId: exercise.templateId,
			resolution,
			sessionIndex: next.sessionCounter,
			now: NOW,
		});
	}

	const stars = starsForSession(resolutions);
	return {
		state: applySessionEnd({ content: curriculum, state: next, unitId, stars }),
		unitId,
		stars,
	};
}

function playSession(
	state: ProgressState,
	perfil: Perfil | Guion,
	seed: number,
): ProgressState {
	return jugarSesion(state, perfil, seed).state;
}

/**
 * La promesa central del producto: nada resta. Ningún ítem pierde aciertos al primer intento
 * ni deja de estar dominado, pase lo que pase en la sesión.
 */
function esperarSinCastigos(
	antes: ProgressState,
	despues: ProgressState,
): void {
	for (const [id, previo] of Object.entries(antes.items)) {
		const actual = despues.items[id];
		expect(actual).toBeDefined();
		if (actual === undefined) continue;
		expect(actual.firstTryCorrect).toBeGreaterThanOrEqual(
			previo.firstTryCorrect,
		);
		expect(actual.assisted).toBeGreaterThanOrEqual(previo.assisted);
		if (previo.masteredAt !== null) {
			expect(actual.masteredAt).toBe(previo.masteredAt);
			expect(isMastered(actual)).toBe(true);
		}
	}
}

describe("un niño que siempre acierta", () => {
	it("avanza de unidad y acumula estrellas", () => {
		let state = emptyProgressState();
		const primeraUnidad = activeUnitId(curriculum, state);
		for (let i = 0; i < 20; i += 1)
			state = playSession(state, "siempre-acierta", i + 1);

		expect(state.sessionCounter).toBe(20);
		expect(activeUnitId(curriculum, state)).not.toBe(primeraUnidad);
		expect(totalStars(state)).toBeGreaterThan(0);
		expect(Object.values(state.units).some((u) => u.status === "done")).toBe(
			true,
		);
	});

	it("desbloquea los primeros logros", () => {
		let state = emptyProgressState();
		for (let i = 0; i < 12; i += 1)
			state = playSession(state, "siempre-acierta", i + 1);
		const earned = earnedRewardIds({
			content: curriculum,
			state,
			totalStars: totalStars(state),
		});
		expect(earned).toContain("first-session");
		expect(earned).toContain("ten-sessions");
	});

	it("nunca pierde una unidad ya terminada", () => {
		let state = emptyProgressState();
		const terminadas = new Set<string>();
		for (let i = 0; i < 25; i += 1) {
			state = playSession(state, "siempre-acierta", i + 1);
			for (const [id, unit] of Object.entries(state.units)) {
				if (unit.status === "done") terminadas.add(id);
			}
			for (const id of terminadas) expect(state.units[id]?.status).toBe("done");
		}
	});

	it("las mejores estrellas nunca bajan", () => {
		let state = emptyProgressState();
		let anterior = 0;
		for (let i = 0; i < 15; i += 1) {
			state = playSession(state, "siempre-acierta", i + 1);
			const actual = totalStars(state);
			expect(actual).toBeGreaterThanOrEqual(anterior);
			anterior = actual;
		}
	});
});

describe("un niño que necesita una pista", () => {
	it("también progresa, más despacio", () => {
		let conPistas = emptyProgressState();
		let perfecto = emptyProgressState();
		for (let i = 0; i < 15; i += 1) {
			conPistas = playSession(conPistas, "falla-una-vez", i + 1);
			perfecto = playSession(perfecto, "siempre-acierta", i + 1);
		}
		expect(totalStars(conPistas)).toBeLessThan(totalStars(perfecto));
		expect(conPistas.sessionCounter).toBe(15);
	});
});

describe("un niño que falla todo", () => {
	it("termina todas las sesiones sin quedarse atascado ni perder nada", () => {
		let state = emptyProgressState();
		for (let i = 0; i < 15; i += 1)
			state = playSession(state, "siempre-falla", i + 1);

		expect(state.sessionCounter).toBe(15);
		expect(state.counters.sessions).toBe(15);
		// Una estrella por sesión completada, nunca cero ni negativo.
		expect(totalStars(state)).toBeGreaterThanOrEqual(1);
		for (const progress of Object.values(state.items)) {
			expect(progress.firstTryCorrect).toBeGreaterThanOrEqual(0);
			expect(progress.box).toBeGreaterThanOrEqual(0);
		}
	});

	it("se queda en la primera unidad, que es lo correcto: no avanza sin dominar", () => {
		let state = emptyProgressState();
		const primera = activeUnitId(curriculum, state);
		for (let i = 0; i < 15; i += 1)
			state = playSession(state, "siempre-falla", i + 1);
		expect(activeUnitId(curriculum, state)).toBe(primera);
	});
});

describe("un niño que empeora: acierta una sesión y falla la siguiente", () => {
	it("una sesión peor no borra las mejores estrellas de la unidad", () => {
		let state = emptyProgressState();
		const mejorPrevio = new Map<string, number>();
		let sesionesPeores = 0;

		for (let i = 0; i < 16; i += 1) {
			const sesion = jugarSesion(state, alternaAciertoYFallo, i + 1);
			const previo = mejorPrevio.get(sesion.unitId) ?? 0;
			if (sesion.stars < previo) sesionesPeores += 1;
			state = sesion.state;

			// La unidad que acaba de ir mal conserva su mejor marca, no la última.
			expect(state.units[sesion.unitId]?.bestStars).toBe(
				Math.max(previo, sesion.stars),
			);
			for (const [id, unit] of Object.entries(state.units)) {
				expect(unit.bestStars).toBeGreaterThanOrEqual(mejorPrevio.get(id) ?? 0);
				mejorPrevio.set(id, unit.bestStars);
			}
		}

		// Sin sesiones peores que la mejor marca, este test no probaría nada.
		expect(sesionesPeores).toBeGreaterThan(0);
		expect(state.units["phase0:clap"]?.bestStars).toBe(3);
	});

	it("fallar nunca resta dominio: sin castigos", () => {
		let state = emptyProgressState();
		let sesionesQueCastigarian = 0;

		for (let i = 0; i < 16; i += 1) {
			const antes = state;
			state = playSession(state, alternaAciertoYFallo, i + 1);
			esperarSinCastigos(antes, state);

			// Un ítem que ya tenía dominio y que esta sesión se resolvió con el modelo:
			// justo el caso en el que un motor con castigos restaría.
			const castigable = Object.entries(antes.items).some(([id, previo]) => {
				const actual = state.items[id];
				return (
					actual !== undefined &&
					previo.firstTryCorrect > 0 &&
					actual.assisted > previo.assisted
				);
			});
			if (castigable) sesionesQueCastigarian += 1;
		}

		// Sin una sola sesión castigable, la comprobación anterior sería vacua.
		expect(sesionesQueCastigarian).toBeGreaterThan(0);
	});
});

describe("un estado guardado con una unidad ya terminada", () => {
	function guardado(): ProgressState {
		return {
			...emptyProgressState(),
			units: { "phase0:clap": { status: "done", bestStars: 3 } },
		};
	}

	it("sigue terminada aunque su dominio esté por debajo del umbral", () => {
		const inicial = guardado();
		// Premisa: sin ningún ítem dominado, esta unidad no volvería a darse por terminada
		// por sí sola. Solo la garantía de no retroceder puede mantenerla en 'done'.
		expect(unitMasteryRatio(curriculum, inicial, "phase0:clap")).toBeLessThan(
			UNIT_COMPLETION_THRESHOLD,
		);
		expect(activeUnitId(curriculum, inicial)).toBe("phase0:rhyme");

		let state = inicial;
		for (let i = 0; i < 6; i += 1)
			state = playSession(state, "siempre-falla", i + 1);

		expect(unitMasteryRatio(curriculum, state, "phase0:clap")).toBeLessThan(
			UNIT_COMPLETION_THRESHOLD,
		);
		expect(state.units["phase0:clap"]?.status).toBe("done");
		expect(state.units["phase0:clap"]?.bestStars).toBe(3);
		// Y el niño no vuelve atrás a una unidad que ya había dejado pasada.
		expect(activeUnitId(curriculum, state)).toBe("phase0:rhyme");
	});
});

describe("el dominio exige sesiones distintas", () => {
	it("dos sesiones perfectas no dominan ningún ítem", () => {
		let state = emptyProgressState();
		for (let i = 0; i < 2; i += 1)
			state = playSession(state, "siempre-acierta", i + 1);

		const progresos = Object.values(state.items);
		expect(progresos.length).toBeGreaterThan(0);
		for (const progreso of progresos) {
			// Como mucho un crédito por sesión: con dos sesiones, dos créditos.
			expect(progreso.firstTryCorrect).toBeLessThanOrEqual(2);
			expect(progreso.masteredAt).toBeNull();
			expect(isMastered(progreso)).toBe(false);
		}
		// Y algún ítem llegó al tope de esas dos sesiones, o no habría nada que limitar.
		expect(progresos.some((p) => p.firstTryCorrect === 2)).toBe(true);
	});

	it("el primer ítem dominado no aparece antes de la tercera sesión", () => {
		let state = emptyProgressState();
		let primeraConDominio = 0;
		for (let i = 0; i < 10 && primeraConDominio === 0; i += 1) {
			state = playSession(state, "siempre-acierta", i + 1);
			if (Object.values(state.items).some((p) => isMastered(p)))
				primeraConDominio = i + 1;
		}

		// El 3 va escrito a mano a propósito: es el umbral de dominio de la especificación,
		// y si alguien lo baja en el motor este test tiene que romperse.
		expect(primeraConDominio).toBeGreaterThanOrEqual(3);
	});
});

describe("invariantes de toda sesión", () => {
	it("todos los ejercicios son coherentes en las tres fases", () => {
		let state = emptyProgressState();
		for (let i = 0; i < 40; i += 1) {
			const unitId = activeUnitId(curriculum, state);
			const plan = planSession({
				content: curriculum,
				state,
				activeUnitId: unitId,
				sessionLength: 6,
				seed: i + 1,
			});
			expect(plan).toHaveLength(6);
			for (const exercise of plan) {
				const item = curriculum.items.get(exercise.itemId);
				expect(item).toBeDefined();
				expect(templates[exercise.templateId].itemKinds).toContain(item?.kind);
				if (exercise.correctOptionId !== null) {
					expect(exercise.optionIds).toContain(exercise.correctOptionId);
				}
			}
			state = playSession(state, "siempre-acierta", i + 1);
		}
	});
});
