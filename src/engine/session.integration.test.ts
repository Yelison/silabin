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
	type ProgressState,
	planSession,
	recordAttempt,
	starsForSession,
	totalStars,
} from "@/engine";

type Perfil = "siempre-acierta" | "falla-una-vez" | "siempre-falla";

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

function playSession(
	state: ProgressState,
	perfil: Perfil,
	seed: number,
): ProgressState {
	const unitId = activeUnitId(curriculum, state);
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
		const resolution = resolveExercise(exercise.templateId, perfil);
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

	return applySessionEnd({
		content: curriculum,
		state: next,
		unitId,
		stars: starsForSession(resolutions),
	});
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
