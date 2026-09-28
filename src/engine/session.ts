import { type Glyph, glyphFor, type LetterCase } from "@/content/glyphs";
import type { CurriculumIndex } from "@/content/index";
import { type HintStep, templates } from "@/content/templates";
import type { Item } from "@/content/types";
import { expectedAnswer } from "@/engine/answers";
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
import { itemProgressOf } from "@/engine/mastery";
import { planSession } from "@/engine/planner";
import { newlyEarnedRewardIds, totalStars } from "@/engine/rewards";
import { starsForSession } from "@/engine/stars";
import {
	type GuideLevel,
	guideLevel,
	isNegligibleTrace,
	scoreTrace,
	type TraceStroke,
} from "@/engine/trace";
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
	/** El caso que traza `trace` en esta corrida (D28), fijado al empezarla. Se lee siempre
	 * con `?? "upper"`: una corrida sin este campo (tests antiguos, documentos previos al
	 * Plan 6) sigue trazando en mayúscula. */
	traceCase?: LetterCase;
};

/** Lo que la interfaz debe enseñar tras una respuesta: la pista, la resolución, o ninguna. */
export type AttemptFeedback = {
	hint: HintStep | null;
	resolution: ExerciseResolution | null;
	/** Solo en `trace` con tinta despreciable (D19): no contó como intento. */
	ignored?: true;
};

/** Veredicto final de un turno de voz: lo decide quien evalúa, el motor no ve audio. */
export type SpokenVerdict = "ok" | "retry";

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
	/** D28: el caso en que se traza `trace` en esta corrida. Sin pasarlo, `run.traceCase`
	 * queda `undefined` y se lee como mayúscula (`?? "upper"`). */
	traceCase?: LetterCase;
}): SessionRun {
	const { content, sessionLength, seed, traceCase } = input;
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
		...(traceCase === undefined ? {} : { traceCase }),
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
 * `expectedAnswer` es la única fuente de esa respuesta. Las plantillas de trazo y de voz no
 * comparan texto (tienen `submitTrace` y `submitSpeech`) y dan `null`; un ítem sin respuesta
 * esperable lanza en vez de dar por buena o mala una respuesta a ciegas.
 */
export function checkAnswer(
	exercise: PlannedExercise,
	item: Item,
	answer: string,
): AttemptOutcome {
	const expected = expectedAnswer(exercise, item);
	if (expected === null)
		throw new Error(
			`El ejercicio ${exercise.id} (${exercise.templateId}) no tiene respuesta que comparar`,
		);
	return answer === expected ? "correct" : "wrong";
}

/**
 * Lo que hoy hacen `submitAnswer` y `submitTrace` en cuanto ya tienen el desenlace del
 * intento (`outcome`): registrar el intento y, si resuelve, aplicar la resolución al
 * progreso. Vive en un solo sitio para que ninguno de los dos pueda dar crédito o pistas de
 * una forma distinta al otro.
 */
function resolveAttempt(
	content: CurriculumIndex,
	run: SessionRun,
	exercise: PlannedExercise,
	outcome: AttemptOutcome,
	now: string,
): { run: SessionRun; feedback: AttemptFeedback } {
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
	const evaluation = templates[exercise.templateId].evaluation;
	if (evaluation === "trace")
		throw new Error(
			`El ejercicio ${exercise.id} es de trazo: usa submitTrace, no submitAnswer`,
		);
	if (evaluation === "voice")
		throw new Error(
			`El ejercicio ${exercise.id} es de voz: usa submitSpeech, no submitAnswer`,
		);
	if (run.attempt.resolved)
		throw new Error(`El ejercicio ${exercise.id} ya está resuelto`);
	const item = content.items.get(exercise.itemId);
	if (item === undefined)
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);

	const outcome = checkAnswer(exercise, item, answer);
	return resolveAttempt(content, run, exercise, outcome, now);
}

/**
 * Igual que `submitAnswer`, pero para la plantilla `trace`: el trazo no tiene una respuesta de
 * texto que comparar, así que el desenlace sale de `scoreTrace` contra la geometría de
 * referencia de la letra. El caso lo fija `run.traceCase` (D28), leído con `?? "upper"`.
 */
export function submitTrace(input: {
	content: CurriculumIndex;
	run: SessionRun;
	strokes: readonly TraceStroke[];
	now: string;
}): { run: SessionRun; feedback: AttemptFeedback } {
	const { content, run, strokes, now } = input;
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation")
		throw new Error(`El ejercicio ${exercise.id} no es una evaluación`);
	if (exercise.templateId !== "trace")
		throw new Error(
			`El ejercicio ${exercise.id} no es de trazo: usa submitAnswer, no submitTrace`,
		);
	if (run.attempt.resolved)
		throw new Error(`El ejercicio ${exercise.id} ya está resuelto`);
	const item = content.items.get(exercise.itemId);
	if (item === undefined)
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);

	const glyph = glyphFor(item, run.traceCase ?? "upper");
	// D19: un toque sin querer ni gasta el intento ni avanza la pista.
	if (isNegligibleTrace(glyph, strokes))
		return { run, feedback: { hint: null, resolution: null, ignored: true } };
	const outcome: AttemptOutcome = scoreTrace(glyph, strokes).correct
		? "correct"
		: "wrong";
	return resolveAttempt(content, run, exercise, outcome, now);
}

/**
 * Igual que `submitTrace`, para las plantillas de voz (`say-it`, `read-word`): el motor no ve
 * audio, solo el veredicto final. `ok` cuenta como acierto y `retry` como fallo, y de ahí
 * `resolveAttempt` decide pista o resolución.
 */
export function submitSpeech(input: {
	content: CurriculumIndex;
	run: SessionRun;
	verdict: SpokenVerdict;
	now: string;
}): { run: SessionRun; feedback: AttemptFeedback } {
	const { content, run, verdict, now } = input;
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation")
		throw new Error(`El ejercicio ${exercise.id} no es una evaluación`);
	if (templates[exercise.templateId].evaluation !== "voice")
		throw new Error(
			`El ejercicio ${exercise.id} no es de voz: usa submitAnswer o submitTrace, no submitSpeech`,
		);
	if (run.attempt.resolved)
		throw new Error(`El ejercicio ${exercise.id} ya está resuelto`);
	if (!content.items.has(exercise.itemId))
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);

	const outcome: AttemptOutcome = verdict === "ok" ? "correct" : "wrong";
	return resolveAttempt(content, run, exercise, outcome, now);
}

/**
 * P12: ¿cierra este trazo el modelo del tercer rung? El niño repasa la guía animada y la
 * vista pregunta al motor si vale; un toque sin querer no cierra el modelo. Lanza si el
 * ejercicio en curso no es una evaluación `trace` resuelta como `assisted`.
 */
export function acceptsModelTrace(
	content: CurriculumIndex,
	run: SessionRun,
	strokes: readonly TraceStroke[],
): boolean {
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation" || exercise.templateId !== "trace")
		throw new Error(
			`El ejercicio ${exercise.id} no es una evaluación de trazo`,
		);
	const last = run.resolutions[run.resolutions.length - 1];
	if (!run.attempt.resolved || last?.status !== "assisted")
		throw new Error(
			`El ejercicio ${exercise.id} no está resuelto como asistido: no hay modelo que repasar`,
		);
	const item = content.items.get(exercise.itemId);
	if (item === undefined)
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);
	return !isNegligibleTrace(glyphFor(item, run.traceCase ?? "upper"), strokes);
}

/** Lo que la interfaz necesita para pintar la guía del trazo: el glifo de referencia y cuánto
 * enseñar de él. */
export type TraceGuide = { glyph: Glyph; level: GuideLevel };

/**
 * Nivel de guía del ejercicio de trazo en curso, según la caja del ítem y las pistas ya
 * mostradas en este intento. Lanza si no hay ejercicio en curso, o si el que hay no es una
 * evaluación de trazo: pedir la guía de otra plantilla es un error de quien llama.
 */
export function traceGuide(
	content: CurriculumIndex,
	run: SessionRun,
): TraceGuide {
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("La sesión ya ha terminado");
	if (exercise.kind !== "evaluation" || exercise.templateId !== "trace")
		throw new Error(
			`El ejercicio ${exercise.id} no es una evaluación de trazo`,
		);
	const item = content.items.get(exercise.itemId);
	if (item === undefined)
		throw new Error(`Ítem desconocido: ${exercise.itemId}`);
	return {
		glyph: glyphFor(item, run.traceCase ?? "upper"),
		level: guideLevel(
			itemProgressOf(run.progress, exercise.itemId).box,
			run.attempt.hintsShown,
		),
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
