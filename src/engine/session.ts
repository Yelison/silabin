import type { CurriculumIndex } from "@/content/index";
import type { HintStep } from "@/content/templates";
import type { Item } from "@/content/types";
import {
	applyPresentation,
	applyResolution,
	applySessionEnd,
} from "@/engine/apply";
import {
	type AttemptOutcome,
	type AttemptState,
	createAttemptState,
	recordAttempt,
} from "@/engine/attempts";
import { planSession } from "@/engine/planner";
import { newlyEarnedRewardIds, totalStars } from "@/engine/rewards";
import { starsForSession } from "@/engine/stars";
import type {
	ExerciseResolution,
	PlannedExercise,
	ProgressState,
	SessionLogEntry,
	Stars,
} from "@/engine/types";
import { activeUnitId, recomputeUnitStatuses } from "@/engine/unlock";

/**
 * Una sesión en curso. Es un valor puro: cada función devuelve una corrida nueva y nunca toca
 * la que recibe, así que la interfaz solo guarda la última y pinta lo que ordena el motor.
 */
export type SessionRun = {
	/** `progress.sessionCounter` al empezar. */
	sessionIndex: number;
	/** La unidad activa, o null en una sesión de solo repaso. */
	unitId: string | null;
	exercises: PlannedExercise[];
	/** Ejercicio en curso; igual a `exercises.length` cuando la sesión ha acabado. */
	cursor: number;
	/** Intento del ejercicio en curso. */
	attempt: AttemptState;
	/** Una por evaluación resuelta, en orden. Las presentaciones no cuentan. */
	resolutions: ExerciseResolution[];
	/** Progreso con todo lo aplicado hasta ahora. */
	progress: ProgressState;
};

/** Lo que la interfaz debe enseñar tras una respuesta: la pista, la resolución, o ninguna. */
export type AttemptFeedback = {
	hint: HintStep | null;
	resolution: ExerciseResolution | null;
};

export type SessionSummary = {
	progress: ProgressState;
	stars: Stars;
	newRewardIds: string[];
	entry: SessionLogEntry;
};

export function startSession(input: {
	content: CurriculumIndex;
	progress: ProgressState;
	sessionLength: 5 | 6;
	seed: number;
}): SessionRun {
	const { content, sessionLength, seed } = input;
	// Los estados de unidad de un documento guardado pueden estar desfasados: se recalculan
	// primero y la unidad activa se decide sobre lo recalculado, no sobre lo guardado.
	const progress: ProgressState = {
		...input.progress,
		units: recomputeUnitStatuses(content, input.progress),
	};
	const unitId = activeUnitId(content, progress);
	const exercises = planSession({
		content,
		state: progress,
		activeUnitId: unitId,
		sessionLength,
		seed,
	});
	return {
		sessionIndex: progress.sessionCounter,
		unitId,
		exercises,
		cursor: 0,
		attempt: createAttemptState(),
		resolutions: [],
		progress,
	};
}

export function currentExercise(run: SessionRun): PlannedExercise | null {
	return run.exercises[run.cursor] ?? null;
}

export function isSessionOver(run: SessionRun): boolean {
	return run.cursor >= run.exercises.length;
}

export function completePresentation(run: SessionRun): SessionRun {
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "presentation")
		throw new Error(`El ejercicio ${exercise.id} no es una presentación`);
	return {
		...run,
		cursor: run.cursor + 1,
		attempt: createAttemptState(),
		progress: applyPresentation(
			run.progress,
			exercise.itemId,
			run.sessionIndex,
		),
	};
}

/**
 * Compara la respuesta con la esperada tal cual, sin normalizar: `"2"` y `" 2"` son distintas.
 * Las plantillas de trazo y de voz tendrán su propio evaluador; hasta entonces, un ítem sin
 * respuesta esperable lanza en vez de dar por buena o mala una respuesta a ciegas.
 */
export function checkAnswer(
	exercise: PlannedExercise,
	item: Item,
	answer: string,
): AttemptOutcome {
	const expected = exercise.correctOptionId ?? item.task?.answer;
	if (expected === undefined)
		throw new Error(
			`El ejercicio ${exercise.id} (${exercise.templateId}) no tiene respuesta que comparar`,
		);
	return answer === expected ? "correct" : "wrong";
}

/**
 * No avanza el cursor aunque el ejercicio quede resuelto: la interfaz todavía tiene que
 * celebrar o mostrar el modelo, y pasa al siguiente con `nextExercise`.
 */
export function submitAnswer(input: {
	content: CurriculumIndex;
	run: SessionRun;
	answer: string;
	now: string;
}): { run: SessionRun; feedback: AttemptFeedback } {
	const { content, run, answer, now } = input;
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation")
		throw new Error(`El ejercicio ${exercise.id} no es una evaluación`);
	if (run.attempt.resolved)
		throw new Error(`El ejercicio ${exercise.id} ya está resuelto`);
	const item = content.items.get(exercise.itemId);
	if (item === undefined)
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);

	const outcome = checkAnswer(exercise, item, answer);
	const step = recordAttempt(exercise.templateId, run.attempt, outcome);
	const feedback: AttemptFeedback = {
		hint: step.hint,
		resolution: step.resolution,
	};
	if (step.resolution === null)
		return { run: { ...run, attempt: step.state }, feedback };

	const progress = applyResolution({
		content,
		state: run.progress,
		itemId: exercise.itemId,
		templateId: exercise.templateId,
		resolution: step.resolution,
		sessionIndex: run.sessionIndex,
		now,
	});
	return {
		run: {
			...run,
			attempt: step.state,
			resolutions: [...run.resolutions, step.resolution],
			progress,
		},
		feedback,
	};
}

export function nextExercise(run: SessionRun): SessionRun {
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation" || !run.attempt.resolved)
		throw new Error(
			`El ejercicio ${exercise.id} todavía no está resuelto: no se puede pasar al siguiente`,
		);
	return { ...run, cursor: run.cursor + 1, attempt: createAttemptState() };
}

export function finishSession(input: {
	content: CurriculumIndex;
	run: SessionRun;
	alreadyUnlocked: readonly string[];
	now: string;
}): SessionSummary {
	const { content, run, alreadyUnlocked, now } = input;
	if (!isSessionOver(run)) throw new Error("La sesión todavía no ha terminado");
	const stars = starsForSession(run.resolutions);
	const progress = applySessionEnd({
		content,
		state: run.progress,
		unitId: run.unitId,
		stars,
	});
	const newRewardIds = newlyEarnedRewardIds(alreadyUnlocked, {
		content,
		state: progress,
		totalStars: totalStars(progress),
	});
	return {
		progress,
		stars,
		newRewardIds,
		entry: {
			index: run.sessionIndex,
			unitId: run.unitId,
			stars,
			endedAt: now,
		},
	};
}
