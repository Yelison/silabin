import { describe, expect, it } from "vitest";
import { LOWER_GLYPHS, UPPER_GLYPHS } from "@/content/glyphs";
import {
	type AttemptState,
	acceptsModelTrace,
	type Box,
	checkAnswer,
	completePresentation,
	createAttemptState,
	currentExercise,
	curriculum,
	emptyProgressState,
	finishSession,
	glyphFor,
	isSessionOver,
	itemProgressOf,
	nextExercise,
	type PlannedExercise,
	type ProgressState,
	type SessionRun,
	starsForSession,
	startSession,
	submitAnswer,
	submitSpeech,
	submitTrace,
	type TraceStroke,
	traceGuide,
} from "@/engine";

const NOW = "2026-09-26T12:00:00.000Z";

function empezar(
	progress: ProgressState = emptyProgressState(),
	sessionLength: 5 | 6 = 5,
): SessionRun {
	return startSession({
		content: curriculum,
		progress,
		sessionLength,
		seed: 1,
	});
}

function ejercicioActual(run: SessionRun): PlannedExercise {
	const exercise = currentExercise(run);
	if (exercise === null) throw new Error("la sesión ya acabó");
	return exercise;
}

/** La respuesta que el contenido da por buena para el ejercicio en curso. */
function respuestaCorrecta(run: SessionRun): string {
	const exercise = ejercicioActual(run);
	if (exercise.correctOptionId !== null) return exercise.correctOptionId;
	const answer = curriculum.items.get(exercise.itemId)?.task?.answer;
	if (answer === undefined) throw new Error("ítem sin respuesta");
	return answer;
}

const RESPUESTA_MALA = "respuesta-que-no-es";

function responder(run: SessionRun, answer: string) {
	return submitAnswer({ content: curriculum, run, answer, now: NOW });
}

/** Pasa las presentaciones del principio hasta llegar a la primera evaluación. */
function hastaPrimeraEvaluacion(run: SessionRun): SessionRun {
	let actual = run;
	while (ejercicioActual(actual).kind === "presentation")
		actual = completePresentation(actual);
	return actual;
}

/** Recorre la sesión entera; `plan` decide cuántos fallos previos lleva cada evaluación. */
function jugarTodo(
	run: SessionRun,
	fallosPrevios: (indiceEvaluacion: number) => number,
): SessionRun {
	let actual = run;
	let evaluacion = 0;
	while (!isSessionOver(actual)) {
		if (ejercicioActual(actual).kind === "presentation") {
			actual = completePresentation(actual);
			continue;
		}
		const fallos = fallosPrevios(evaluacion);
		for (let i = 0; i < fallos; i++)
			actual = responder(actual, RESPUESTA_MALA).run;
		if (fallos < 3) actual = responder(actual, respuestaCorrecta(actual)).run;
		actual = nextExercise(actual);
		evaluacion += 1;
	}
	return actual;
}

const LETTER_A_ID = "letter:a";
const TRACE_EXERCISE: PlannedExercise = {
	id: "ex-trace",
	kind: "evaluation",
	templateId: "trace",
	itemId: LETTER_A_ID,
	optionIds: [],
	correctOptionId: null,
	source: "active-unit",
};
const LISTEN_TAP_EXERCISE: PlannedExercise = {
	id: "ex-listen-tap",
	kind: "evaluation",
	templateId: "listen-tap",
	itemId: LETTER_A_ID,
	optionIds: ["a", "b"],
	correctOptionId: "a",
	source: "active-unit",
};

const SAY_IT_EXERCISE: PlannedExercise = {
	id: "ex-say-it",
	kind: "evaluation",
	templateId: "say-it",
	itemId: "syllable:ma",
	optionIds: [],
	correctOptionId: null,
	source: "active-unit",
};
const READ_WORD_EXERCISE: PlannedExercise = {
	id: "ex-read-word",
	kind: "evaluation",
	templateId: "read-word",
	itemId: "word:mapa",
	optionIds: [],
	correctOptionId: null,
	source: "active-unit",
};

const GLYPH_A = UPPER_GLYPHS.a;
if (GLYPH_A === undefined) throw new Error("falta UPPER_GLYPHS.a");
/** El propio trazo de referencia de la A: puntúa correcto (G14 en glyphs.test.ts). */
const TRAZO_CORRECTO: TraceStroke[] = GLYPH_A.strokes;
/** Tinta de sobra pero lejos de la letra: puntúa incorrecto y no es despreciable (D19). */
const TRAZO_MALO: TraceStroke[] = [
	[
		{ x: 5, y: 5 },
		{ x: 6, y: 6 },
	],
];

/** Monta a mano una sesión de un solo ejercicio, sin pasar por el planificador. */
function runCon(
	exercise: PlannedExercise,
	progress: ProgressState = emptyProgressState(),
	attempt: AttemptState = createAttemptState(),
): SessionRun {
	return {
		sessionIndex: progress.sessionCounter,
		unitId: null,
		exercises: [exercise],
		cursor: 0,
		attempt,
		resolutions: [],
		progress,
	};
}

function trazoDesde(
	progress: ProgressState = emptyProgressState(),
	attempt: AttemptState = createAttemptState(),
): SessionRun {
	return runCon(TRACE_EXERCISE, progress, attempt);
}

function trazar(run: SessionRun, strokes: readonly TraceStroke[]) {
	return submitTrace({ content: curriculum, run, strokes, now: NOW });
}

function hablar(run: SessionRun, verdict: "ok" | "retry") {
	return submitSpeech({ content: curriculum, run, verdict, now: NOW });
}

/** Deja el ejercicio de `run` con `n` fallos ya registrados, por la vía del motor. */
function conFallos(run: SessionRun, n: number): SessionRun {
	let actual = run;
	for (let i = 0; i < n; i++) actual = hablar(actual, "retry").run;
	return actual;
}

function conCaja(
	progress: ProgressState,
	itemId: string,
	box: Box,
): ProgressState {
	return {
		...progress,
		items: {
			...progress.items,
			[itemId]: { ...itemProgressOf(progress, itemId), box },
		},
	};
}

describe("startSession", () => {
	it("R1: sobre estado vacío arranca phase0:clap con las presentaciones primero", () => {
		const run = empezar();
		expect(run.unitId).toBe("phase0:clap");
		expect(run.sessionIndex).toBe(0);
		expect(run.cursor).toBe(0);
		expect(run.resolutions).toEqual([]);
		expect(run.attempt).toEqual({ attempt: 1, hintsShown: 0, resolved: false });
		expect(run.exercises.slice(0, 2).map((e) => e.kind)).toEqual([
			"presentation",
			"presentation",
		]);
		expect(run.exercises.slice(2).every((e) => e.kind === "evaluation")).toBe(
			true,
		);
		expect(isSessionOver(run)).toBe(false);
	});

	it("R1b: decide la unidad activa con los estados recalculados, no con los guardados", () => {
		// Un documento antiguo que dice 'active' para una unidad bloqueada y no tiene la primera.
		const guardado: ProgressState = {
			...emptyProgressState(),
			units: {
				"phase0:clap": { status: "locked", bestStars: 0 },
				"phase0:rhyme": { status: "active", bestStars: 0 },
			},
		};
		const run = empezar(guardado);
		expect(run.unitId).toBe("phase0:clap");
		expect(run.progress.units["phase0:clap"]?.status).toBe("active");
		expect(run.progress.units["phase0:rhyme"]?.status).toBe("locked");
	});

	it("R1c: si no queda unidad activa la sesión es de solo repaso, con unitId null", () => {
		const items: ProgressState["items"] = {};
		for (const id of curriculum.items.keys())
			items[id] = {
				...itemProgressOf(emptyProgressState(), id),
				presented: true,
				box: 3,
				firstTryCorrect: 9,
				lastCreditSession: 0,
				masteredAt: NOW,
			};
		const units: ProgressState["units"] = {};
		for (const id of curriculum.unitOrder)
			units[id] = { status: "done", bestStars: 3 };
		const run = empezar({ ...emptyProgressState(), items, units });
		expect(run.unitId).toBeNull();
		expect(run.exercises.every((e) => e.source === "review")).toBe(true);
	});
});

describe("checkAnswer", () => {
	const exercise = (correctOptionId: string | null): PlannedExercise => ({
		id: "ex-1",
		kind: "evaluation",
		templateId: "count-syllables",
		itemId: "oral:clap:mesa",
		optionIds: correctOptionId === null ? [] : [correctOptionId, "y"],
		correctOptionId,
		source: "active-unit",
	});
	const mesa = curriculum.items.get("oral:clap:mesa");

	it("R2: sin opciones compara con task.answer, sin normalizar", () => {
		if (mesa === undefined) throw new Error("falta oral:clap:mesa");
		expect(checkAnswer(exercise(null), mesa, "2")).toBe("correct");
		expect(checkAnswer(exercise(null), mesa, "3")).toBe("wrong");
		expect(checkAnswer(exercise(null), mesa, " 2")).toBe("wrong");
		expect(checkAnswer(exercise(null), mesa, "2 ")).toBe("wrong");
	});

	it("R3: con correctOptionId compara con él y no con task.answer", () => {
		if (mesa === undefined) throw new Error("falta oral:clap:mesa");
		expect(checkAnswer(exercise("x"), mesa, "x")).toBe("correct");
		expect(checkAnswer(exercise("x"), mesa, "y")).toBe("wrong");
		expect(checkAnswer(exercise("x"), mesa, "2")).toBe("wrong");
	});

	it("R3b: sin opción correcta ni respuesta en el ítem lanza", () => {
		const letra = curriculum.items.get("letter:a");
		if (letra === undefined) throw new Error("falta letter:a");
		expect(letra.task).toBeUndefined();
		expect(() => checkAnswer(exercise(null), letra, "a")).toThrow();
	});
});

describe("completePresentation", () => {
	it("R5: dos presentaciones avanzan el cursor y marcan los ítems como presentados", () => {
		const run = empezar();
		const uno = completePresentation(run);
		const dos = completePresentation(uno);
		expect(uno.cursor).toBe(1);
		expect(dos.cursor).toBe(2);
		for (const exercise of run.exercises.slice(0, 2)) {
			expect(run.progress.items[exercise.itemId]?.presented).toBeUndefined();
			expect(dos.progress.items[exercise.itemId]?.presented).toBe(true);
			expect(dos.progress.items[exercise.itemId]?.lastSessionIndex).toBe(0);
		}
	});

	it("solo vale sobre una presentación", () => {
		const enEvaluacion = hastaPrimeraEvaluacion(empezar());
		expect(() => completePresentation(enEvaluacion)).toThrow();
	});

	it("lanza cuando la sesión ya acabó", () => {
		const acabada = jugarTodo(empezar(), () => 0);
		expect(() => completePresentation(acabada)).toThrow();
	});
});

describe("submitAnswer", () => {
	it("R4: sobre una presentación lanza", () => {
		expect(() => responder(empezar(), "2")).toThrow();
	});

	it("R6: acierto al primer intento da crédito de dominio y no avanza el cursor", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		const itemId = ejercicioActual(run).itemId;
		const { run: despues, feedback } = responder(run, respuestaCorrecta(run));
		expect(feedback).toEqual({
			hint: null,
			resolution: { status: "mastery-credit" },
		});
		expect(despues.cursor).toBe(run.cursor);
		expect(despues.attempt.resolved).toBe(true);
		expect(despues.resolutions).toEqual([{ status: "mastery-credit" }]);
		expect(despues.progress.items[itemId]?.firstTryCorrect).toBe(1);
	});

	it("R7: tres fallos dan las pistas reduce, sound y el modelo, y se resuelve asistida", () => {
		let run = hastaPrimeraEvaluacion(empezar());
		const itemId = ejercicioActual(run).itemId;
		const pistas: (string | undefined)[] = [];
		const resoluciones: (string | undefined)[] = [];
		for (let i = 0; i < 3; i++) {
			const paso = responder(run, RESPUESTA_MALA);
			pistas.push(paso.feedback.hint?.rung);
			resoluciones.push(paso.feedback.resolution?.status);
			run = paso.run;
			expect(run.cursor).toBe(2);
		}
		expect(pistas).toEqual(["reduce", "sound", "model"]);
		expect(resoluciones).toEqual([undefined, undefined, "assisted"]);
		expect(run.resolutions).toEqual([{ status: "assisted" }]);
		expect(run.progress.items[itemId]?.assisted).toBe(1);
	});

	it("R8: fallo y luego acierto es correct-with-hint y el ítem baja a caja 1", () => {
		let run = hastaPrimeraEvaluacion(empezar());
		const itemId = ejercicioActual(run).itemId;
		// Con el ítem ya en caja 3 se ve que baja a 1 y no se queda o sube.
		run = {
			...run,
			progress: {
				...run.progress,
				items: {
					...run.progress.items,
					[itemId]: { ...itemProgressOf(run.progress, itemId), box: 3 },
				},
			},
		};
		const fallo = responder(run, RESPUESTA_MALA);
		expect(fallo.feedback.resolution).toBeNull();
		expect(fallo.run.resolutions).toEqual([]);
		const acierto = responder(fallo.run, respuestaCorrecta(fallo.run));
		expect(acierto.feedback.resolution).toEqual({
			status: "correct-with-hint",
			hintsUsed: 1,
		});
		expect(acierto.run.resolutions).toEqual([
			{ status: "correct-with-hint", hintsUsed: 1 },
		]);
		expect(acierto.run.progress.items[itemId]?.box).toBe(1);
	});

	it("R9: sobre una evaluación ya resuelta lanza", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		const resuelta = responder(run, respuestaCorrecta(run)).run;
		expect(() => responder(resuelta, respuestaCorrecta(run))).toThrow();
	});

	it("lanza cuando la sesión ya acabó", () => {
		const acabada = jugarTodo(empezar(), () => 0);
		expect(() => responder(acabada, "2")).toThrow();
	});

	it("nunca normaliza en silencio: ' 2' cuenta como fallo", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		const { feedback } = responder(run, ` ${respuestaCorrecta(run)}`);
		expect(feedback.hint?.rung).toBe("reduce");
		expect(feedback.resolution).toBeNull();
	});

	it("C5: sobre un ejercicio de trazo lanza nombrando submitTrace, no el mensaje de checkAnswer", () => {
		expect(() => responder(trazoDesde(), "a")).toThrow(/submitTrace/);
	});
});

describe("submitTrace", () => {
	it("C1: acierto al primer intento da mastery-credit, resuelve y suma counters.traces", () => {
		const { run, feedback } = trazar(trazoDesde(), TRAZO_CORRECTO);
		expect(feedback).toEqual({
			hint: null,
			resolution: { status: "mastery-credit" },
		});
		expect(run.attempt.resolved).toBe(true);
		expect(run.progress.counters.traces).toBe(1);
	});

	it("C2: trazo vacío en el 1.er intento da la pista reduce, sin resolver, y deja el 2.o intento con 1 pista mostrada", () => {
		const { run, feedback } = trazar(trazoDesde(), TRAZO_MALO);
		expect(feedback.resolution).toBeNull();
		expect(feedback.hint?.rung).toBe("reduce");
		expect(feedback.hint?.action).toBe("restore-previous-guide-level");
		expect(run.attempt).toEqual({ attempt: 2, hintsShown: 1, resolved: false });
	});

	it("C3: tres fallos seguidos dan las pistas reduce, sound y model, y resuelven asistido con counters.traces +1 una sola vez", () => {
		let run = trazoDesde();
		const pistas: (string | undefined)[] = [];
		const resoluciones: (string | undefined)[] = [];
		for (let i = 0; i < 3; i++) {
			const paso = trazar(run, TRAZO_MALO);
			pistas.push(paso.feedback.hint?.rung);
			resoluciones.push(paso.feedback.resolution?.status);
			run = paso.run;
		}
		expect(pistas).toEqual(["reduce", "sound", "model"]);
		expect(resoluciones).toEqual([undefined, undefined, "assisted"]);
		expect(run.progress.counters.traces).toBe(1);
	});

	it("C4: fallo y después acierto es correct-with-hint con hintsUsed 1", () => {
		const fallo = trazar(trazoDesde(), TRAZO_MALO);
		const acierto = trazar(fallo.run, TRAZO_CORRECTO);
		expect(acierto.feedback.resolution).toEqual({
			status: "correct-with-hint",
			hintsUsed: 1,
		});
	});

	it("C6: sobre otra plantilla, sobre una presentación, ya resuelto o con la sesión acabada, lanza", () => {
		// Otra plantilla (no trazo): nombra submitAnswer.
		expect(() => trazar(runCon(LISTEN_TAP_EXERCISE), TRAZO_CORRECTO)).toThrow(
			/submitAnswer/,
		);
		// Presentación.
		expect(() => trazar(empezar(), TRAZO_CORRECTO)).toThrow();
		// Ya resuelto.
		const resuelto = trazar(trazoDesde(), TRAZO_CORRECTO).run;
		expect(() => trazar(resuelto, TRAZO_CORRECTO)).toThrow();
		// Sesión acabada.
		const acabada = jugarTodo(empezar(), () => 0);
		expect(() => trazar(acabada, TRAZO_CORRECTO)).toThrow();
	});
});

describe("submitTrace: tinta despreciable (D19)", () => {
	const PUNTO: TraceStroke[] = [[{ x: 0.5, y: 0.5 }]];

	it("M2: un punto devuelve la misma corrida, ignored, sin pista ni resolución, y no gasta el primer intento", () => {
		const antes = trazoDesde();
		const { run, feedback } = trazar(antes, PUNTO);
		expect(run).toBe(antes);
		expect(run.attempt).toEqual({ attempt: 1, hintsShown: 0, resolved: false });
		expect(feedback).toEqual({ hint: null, resolution: null, ignored: true });

		const acierto = trazar(run, TRAZO_CORRECTO);
		expect(acierto.feedback.resolution).toEqual({ status: "mastery-credit" });
		expect(acierto.feedback.ignored).toBeUndefined();
	});

	it("M2b: un trazo real y equivocado sigue contando como fallo", () => {
		const largoPeroMalo: TraceStroke[] = [
			[
				{ x: 5, y: 5 },
				{ x: 6, y: 6 },
			],
		];
		const { feedback, run } = trazar(trazoDesde(), largoPeroMalo);
		expect(feedback.hint?.rung).toBe("reduce");
		expect(feedback.ignored).toBeUndefined();
		expect(run.attempt.attempt).toBe(2);
	});
});

describe("acceptsModelTrace", () => {
	function trasTresFallos(): SessionRun {
		let run = trazoDesde();
		for (let i = 0; i < 3; i++)
			run = trazar(run, [
				[
					{ x: 5, y: 5 },
					{ x: 6, y: 6 },
				],
			]).run;
		return run;
	}

	it("M3: tras 3 fallos, un punto no cierra el modelo y un trazo completo sí", () => {
		const run = trasTresFallos();
		expect(run.attempt.resolved).toBe(true);
		expect(acceptsModelTrace(curriculum, run, [[{ x: 0.5, y: 0.5 }]])).toBe(
			false,
		);
		expect(acceptsModelTrace(curriculum, run, [])).toBe(false);
		expect(acceptsModelTrace(curriculum, run, TRAZO_CORRECTO)).toBe(true);
	});

	it("M3b: lanza en say-it y en un trace todavía sin resolver", () => {
		expect(() =>
			acceptsModelTrace(curriculum, runCon(SAY_IT_EXERCISE), TRAZO_CORRECTO),
		).toThrow();
		expect(() =>
			acceptsModelTrace(curriculum, trazoDesde(), TRAZO_CORRECTO),
		).toThrow();
	});

	it("M3c: lanza en un trace resuelto sin ayuda (no es el modelo del tercer rung)", () => {
		const resuelto = trazar(trazoDesde(), TRAZO_CORRECTO).run;
		expect(() =>
			acceptsModelTrace(curriculum, resuelto, TRAZO_CORRECTO),
		).toThrow();
	});
});

describe("submitSpeech", () => {
	it("M4a: ok al 1.er intento da mastery-credit y resuelve", () => {
		const { run, feedback } = hablar(runCon(SAY_IT_EXERCISE), "ok");
		expect(feedback).toEqual({
			hint: null,
			resolution: { status: "mastery-credit" },
		});
		expect(run.attempt.resolved).toBe(true);
	});

	it("M4b: retry da la pista reduce propia de cada plantilla", () => {
		const say = hablar(runCon(SAY_IT_EXERCISE), "retry");
		expect(say.feedback.resolution).toBeNull();
		expect(say.feedback.hint?.rung).toBe("reduce");
		expect(say.feedback.hint?.action).toBe("show-mouth+replay-instruction");
		expect(say.run.attempt).toEqual({
			attempt: 2,
			hintsShown: 1,
			resolved: false,
		});
		const read = hablar(runCon(READ_WORD_EXERCISE), "retry");
		expect(read.feedback.hint?.action).toBe(
			"split-syllables+replay-instruction",
		);
	});

	it("M4c: retry x3 resuelve asistido con play-full+accept-any-speech", () => {
		let run = runCon(SAY_IT_EXERCISE);
		const pasos = [];
		for (let i = 0; i < 3; i++) {
			const paso = hablar(run, "retry");
			pasos.push(paso.feedback);
			run = paso.run;
		}
		expect(pasos.map((f) => f.hint?.rung)).toEqual([
			"reduce",
			"sound",
			"model",
		]);
		expect(pasos[2]?.hint?.action).toBe("play-full+accept-any-speech");
		expect(pasos[2]?.resolution).toEqual({ status: "assisted" });
		expect(run.attempt.resolved).toBe(true);
	});

	it("M4d: ok tras un retry es correct-with-hint", () => {
		const { feedback } = hablar(conFallos(runCon(SAY_IT_EXERCISE), 1), "ok");
		expect(feedback.resolution).toEqual({
			status: "correct-with-hint",
			hintsUsed: 1,
		});
	});

	it("M5: lanza en trace, listen-tap, presentación, resuelto y sesión acabada", () => {
		expect(() => hablar(trazoDesde(), "ok")).toThrow();
		expect(() => hablar(runCon(LISTEN_TAP_EXERCISE), "ok")).toThrow();
		expect(() => hablar(empezar(), "ok")).toThrow();
		const resuelto = hablar(runCon(SAY_IT_EXERCISE), "ok").run;
		expect(() => hablar(resuelto, "ok")).toThrow();
		expect(() =>
			hablar(
				jugarTodo(empezar(), () => 0),
				"ok",
			),
		).toThrow();
	});

	it("M5b: submitAnswer lanza en say-it y en read-word nombrando submitSpeech", () => {
		expect(() => responder(runCon(SAY_IT_EXERCISE), "ma")).toThrow(
			/submitSpeech/,
		);
		expect(() => responder(runCon(READ_WORD_EXERCISE), "mapa")).toThrow(
			/submitSpeech/,
		);
	});

	it("M5c: submitSpeech con ítem desconocido lanza", () => {
		const raro: PlannedExercise = { ...SAY_IT_EXERCISE, itemId: "syllable:zz" };
		expect(() => hablar(runCon(raro), "ok")).toThrow();
	});

	it("M5d: submitSpeech no muta la corrida recibida", () => {
		const antes = runCon(SAY_IT_EXERCISE);
		const copia = structuredClone(antes);
		hablar(antes, "ok");
		expect(antes).toEqual(copia);
	});
});

describe("traceCase (D28)", () => {
	const lowerA = LOWER_GLYPHS.a;
	if (lowerA === undefined) throw new Error("falta LOWER_GLYPHS.a");
	const upperA = UPPER_GLYPHS.a;
	if (upperA === undefined) throw new Error("falta UPPER_GLYPHS.a");

	it("L5a: startSession fija traceCase tal cual se pasa; sin pasarlo, queda undefined", () => {
		const conMinuscula = startSession({
			content: curriculum,
			progress: emptyProgressState(),
			sessionLength: 5,
			seed: 1,
			traceCase: "lower",
		});
		expect(conMinuscula.traceCase).toBe("lower");
		expect(empezar().traceCase).toBeUndefined();
	});

	it("L5b: submitTrace en minúscula puntúa contra LOWER_GLYPHS; la A mayúscula falla", () => {
		const run: SessionRun = { ...trazoDesde(), traceCase: "lower" };
		const acierto = trazar(run, lowerA.strokes);
		expect(acierto.feedback.resolution).toEqual({ status: "mastery-credit" });

		// Documentado (S24/D28): la A mayúscula no es un par confundible con la a minúscula
		// (medido en glyphs.test.ts): falla por precisión (0.77 < MIN_PRECISION 0.8), aunque
		// su cobertura ya pase.
		const conMayuscula = trazar(run, upperA.strokes);
		expect(conMayuscula.feedback.resolution).toBeNull();
	});

	it("L5c: traceGuide en minúscula devuelve el glifo de LOWER_GLYPHS", () => {
		const run: SessionRun = { ...trazoDesde(), traceCase: "lower" };
		expect(traceGuide(curriculum, run).glyph).toBe(lowerA);
	});

	it('L5d: acceptsModelTrace usa run.traceCase, no "upper" fijo (isNegligibleTrace no distingue formas, solo longitudes: hay que usar letras con largos de referencia distintos para que la mutación se note)', () => {
		// LOWER l (un palo, largo 1.0) vs UPPER L (palo + remate, largo 1.6): un trazo de
		// 0.13 supera el umbral de la minúscula (0.1 × 1.0 = 0.1) pero no el de la mayúscula
		// (0.1 × 1.6 = 0.16). Si acceptsModelTrace ignorara run.traceCase (mutación: "upper"
		// fijo), este mismo trazo se rechazaría por despreciable.
		const exerciseL: PlannedExercise = {
			...TRACE_EXERCISE,
			itemId: "letter:l",
		};
		let run: SessionRun = { ...runCon(exerciseL), traceCase: "lower" };
		for (let i = 0; i < 3; i++) run = trazar(run, TRAZO_MALO).run;
		expect(run.attempt.resolved).toBe(true);
		const trazoCorto: TraceStroke[] = [
			[
				{ x: 0.1, y: 0.4 },
				{ x: 0.1, y: 0.53 },
			],
		];
		expect(acceptsModelTrace(curriculum, run, trazoCorto)).toBe(true);
	});

	it('L5e: sin traceCase en la corrida, submitTrace/traceGuide siguen leyendo mayúscula (?? "upper")', () => {
		const run: SessionRun = { ...trazoDesde() };
		expect(run.traceCase).toBeUndefined();
		expect(traceGuide(curriculum, run).glyph).toEqual(UPPER_GLYPHS.a);
		const acierto = trazar(run, TRAZO_CORRECTO);
		expect(acierto.feedback.resolution).toEqual({ status: "mastery-credit" });
	});
});

describe("traceGuide", () => {
	const letraA = curriculum.items.get(LETTER_A_ID);
	if (letraA === undefined) throw new Error(`falta ${LETTER_A_ID}`);

	it("C7: nivel según la caja del ítem y las pistas ya mostradas", () => {
		const caja0 = trazoDesde(conCaja(emptyProgressState(), LETTER_A_ID, 0));
		expect(traceGuide(curriculum, caja0)).toEqual({
			glyph: glyphFor(letraA, "upper"),
			level: 1,
		});

		const caja2 = trazoDesde(conCaja(emptyProgressState(), LETTER_A_ID, 2));
		expect(traceGuide(curriculum, caja2).level).toBe(3);

		const caja2Fallo1 = trazoDesde(
			conCaja(emptyProgressState(), LETTER_A_ID, 2),
			{ attempt: 2, hintsShown: 1, resolved: false },
		);
		expect(traceGuide(curriculum, caja2Fallo1).level).toBe(2);

		const caja2Fallo3 = trazoDesde(
			conCaja(emptyProgressState(), LETTER_A_ID, 2),
			{ attempt: 3, hintsShown: 3, resolved: true },
		);
		expect(traceGuide(curriculum, caja2Fallo3).level).toBe(1);
	});

	it("C8: sin una evaluación de trazo en curso, o con la sesión terminada, lanza", () => {
		expect(() => traceGuide(curriculum, runCon(LISTEN_TAP_EXERCISE))).toThrow();
		const acabada = jugarTodo(empezar(), () => 0);
		expect(() => traceGuide(curriculum, acabada)).toThrow();
	});
});

describe("nextExercise", () => {
	it("R9b: antes de resolver lanza", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		expect(() => nextExercise(run)).toThrow();
		const conFallo = responder(run, RESPUESTA_MALA).run;
		expect(() => nextExercise(conFallo)).toThrow();
	});

	it("lanza sobre una presentación", () => {
		expect(() => nextExercise(empezar())).toThrow();
	});

	it("R10: avanza y reinicia el estado del intento", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		// Un fallo previo deja el intento en 2 con una pista, para que el reinicio se note.
		const conFallo = responder(run, RESPUESTA_MALA).run;
		const resuelta = responder(conFallo, respuestaCorrecta(conFallo)).run;
		expect(resuelta.attempt.attempt).toBe(2);
		const siguiente = nextExercise(resuelta);
		expect(siguiente.cursor).toBe(run.cursor + 1);
		expect(siguiente.attempt).toEqual({
			attempt: 1,
			hintsShown: 0,
			resolved: false,
		});
	});
});

describe("finishSession", () => {
	it("R11: sesión entera acertando al primer intento da 3 estrellas y cuenta la sesión", () => {
		const run = jugarTodo(empezar(), () => 0);
		expect(isSessionOver(run)).toBe(true);
		expect(currentExercise(run)).toBeNull();
		const resumen = finishSession({
			content: curriculum,
			run,
			alreadyUnlocked: [],
			now: NOW,
		});
		expect(resumen.stars).toBe(3);
		expect(resumen.entry).toEqual({
			index: 0,
			unitId: "phase0:clap",
			stars: 3,
			endedAt: NOW,
		});
		expect(resumen.progress.sessionCounter).toBe(1);
		expect(resumen.progress.units["phase0:clap"]?.bestStars).toBe(3);
		expect(resumen.newRewardIds).toContain("first-session");
	});

	it("R12: las presentaciones no cuentan; las estrellas salen solo de las evaluaciones", () => {
		const inicio = empezar(emptyProgressState(), 6);
		const evaluaciones = inicio.exercises.filter(
			(e) => e.kind === "evaluation",
		).length;
		expect(evaluaciones).toBe(4);
		// Una evaluación asistida de cuatro: 3/4 al primer intento.
		const run = jugarTodo(inicio, (i) => (i === 1 ? 3 : 0));
		expect(run.resolutions).toHaveLength(evaluaciones);
		const resumen = finishSession({
			content: curriculum,
			run,
			alreadyUnlocked: [],
			now: NOW,
		});
		expect(resumen.stars).toBe(starsForSession(run.resolutions));
		expect(resumen.stars).toBe(1);
		expect(resumen.progress.units["phase0:clap"]?.bestStars).toBe(1);
	});

	it("R13: antes de acabar lanza", () => {
		const run = hastaPrimeraEvaluacion(empezar());
		expect(() =>
			finishSession({
				content: curriculum,
				run,
				alreadyUnlocked: [],
				now: NOW,
			}),
		).toThrow();
	});

	it("R14: un logro que ya estaba desbloqueado no vuelve a salir como nuevo", () => {
		const run = jugarTodo(empezar(), () => 0);
		const nuevo = finishSession({
			content: curriculum,
			run,
			alreadyUnlocked: [],
			now: NOW,
		});
		expect(nuevo.newRewardIds).toContain("first-session");
		const repetido = finishSession({
			content: curriculum,
			run,
			alreadyUnlocked: ["first-session"],
			now: NOW,
		});
		expect(repetido.newRewardIds).not.toContain("first-session");
		expect(repetido.newRewardIds).toEqual(
			nuevo.newRewardIds.filter((id) => id !== "first-session"),
		);
	});

	it("una sesión de solo repaso termina con unitId null y sin tocar mejores marcas", () => {
		const items: ProgressState["items"] = {};
		for (const id of curriculum.items.keys())
			items[id] = {
				...itemProgressOf(emptyProgressState(), id),
				presented: true,
				box: 1,
				firstTryCorrect: 9,
				lastCreditSession: 0,
				masteredAt: NOW,
			};
		const units: ProgressState["units"] = {};
		for (const id of curriculum.unitOrder)
			units[id] = { status: "done", bestStars: 2 };
		const inicio = empezar({
			...emptyProgressState(),
			sessionCounter: 7,
			items,
			units,
		});
		expect(inicio.unitId).toBeNull();
		// Trazo y voz aún no tienen evaluador y checkAnswer lanza con ellos: se juega solo
		// lo que ya se puede evaluar.
		const jugable = {
			...inicio,
			exercises: inicio.exercises.filter((e) => e.templateId === "listen-tap"),
		};
		expect(jugable.exercises.length).toBeGreaterThan(0);
		const run = jugarTodo(jugable, () => 0);
		const resumen = finishSession({
			content: curriculum,
			run,
			alreadyUnlocked: [],
			now: NOW,
		});
		expect(resumen.entry.unitId).toBeNull();
		expect(resumen.entry.index).toBe(7);
		expect(resumen.progress.sessionCounter).toBe(8);
		for (const id of curriculum.unitOrder)
			expect(resumen.progress.units[id]?.bestStars).toBe(units[id]?.bestStars);
	});
});

describe("índice de sesión", () => {
	it("presentaciones y resoluciones se anotan con el índice de la sesión, no con 0", () => {
		const inicio = empezar({ ...emptyProgressState(), sessionCounter: 3 });
		expect(inicio.sessionIndex).toBe(3);
		const dos = completePresentation(completePresentation(inicio));
		for (const exercise of inicio.exercises.slice(0, 2))
			expect(dos.progress.items[exercise.itemId]?.lastSessionIndex).toBe(3);
		const evaluada = responder(dos, respuestaCorrecta(dos)).run;
		const itemId = ejercicioActual(dos).itemId;
		expect(evaluada.progress.items[itemId]?.lastSessionIndex).toBe(3);
		expect(evaluada.progress.items[itemId]?.lastCreditSession).toBe(3);
	});
});

describe("pureza", () => {
	it("R15: ninguna función muta el run que recibe", () => {
		const fotografiar = (run: SessionRun) => structuredClone(run);
		const comprobar = <T>(
			run: SessionRun,
			llamada: (r: SessionRun) => T,
		): T => {
			const antes = fotografiar(run);
			const resultado = llamada(run);
			expect(run).toEqual(antes);
			return resultado;
		};

		let run = empezar();
		run = comprobar(run, completePresentation);
		run = comprobar(run, completePresentation);
		// fallo, luego acierto
		run = comprobar(run, (r) => responder(r, RESPUESTA_MALA)).run;
		run = comprobar(run, (r) => responder(r, respuestaCorrecta(r))).run;
		run = comprobar(run, nextExercise);
		run = comprobar(run, (r) => responder(r, respuestaCorrecta(r))).run;
		run = comprobar(run, nextExercise);
		run = comprobar(run, (r) => responder(r, respuestaCorrecta(r))).run;
		run = comprobar(run, nextExercise);
		expect(isSessionOver(run)).toBe(true);
		comprobar(run, (r) =>
			finishSession({
				content: curriculum,
				run: r,
				alreadyUnlocked: [],
				now: NOW,
			}),
		);
	});

	it("startSession no muta el progreso que recibe", () => {
		const progress = emptyProgressState();
		const antes = structuredClone(progress);
		empezar(progress);
		expect(progress).toEqual(antes);
	});
});
