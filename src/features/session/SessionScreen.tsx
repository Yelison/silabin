"use client";

import { useEffect, useRef, useState } from "react";
import { useLongPress } from "@/components/use-long-press";
import {
	type AttemptFeedback,
	currentExercise,
	curriculum,
	isSessionOver,
	type PlannedExercise,
	type SessionRun,
	type SpokenVerdict,
	type TemplateId,
	type TraceStroke,
	templates,
	traceGuide,
} from "@/engine";
import { useApp, useAudio } from "@/features/app-context";
import { type TemplateViews, templateViews } from "@/features/session/registry";

/** Lo que hay que mantener la esquina para salir. Un niño no lo hace sin querer. */
export const EXIT_HOLD_MS = 1500;
/** Lo que dura la celebración de un acierto antes de pasar al siguiente ejercicio. */
export const CELEBRATION_MS = 700;

type Views = Partial<Record<TemplateId, TemplateViews>>;

function pausa(ms: number): Promise<void> {
	return ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));
}

/** Botón de salida del adulto: sin texto, discreto y solo responde a una pulsación larga. */
function SalirAdulto(props: { onLongPress: () => void }) {
	const handlers = useLongPress(props.onLongPress, EXIT_HOLD_MS);
	return (
		<button
			type="button"
			aria-label="Salir (mantener pulsado)"
			{...handlers}
			// Sin menú contextual ni selección: mantener pulsado es el gesto.
			onContextMenu={(e) => e.preventDefault()}
			style={{ touchAction: "none", userSelect: "none" }}
			className="h-12 w-12 shrink-0 rounded-full bg-card text-xl text-ink-soft"
		>
			✕
		</button>
	);
}

function Progreso(props: { cursor: number; total: number }) {
	const { cursor, total } = props;
	const pct = total === 0 ? 0 : Math.min(100, (cursor / total) * 100);
	return (
		<div
			role="progressbar"
			aria-label="Progreso"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={cursor}
			className="h-4 flex-1 overflow-hidden rounded-full bg-calm"
		>
			<div
				className="h-full rounded-full bg-calm-border transition-[width]"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

/**
 * Un ejercicio. Se monta con `key={exercise.id}`: cada ejercicio empieza con el estado limpio
 * y una respuesta tardía del anterior no puede tocar el siguiente.
 */
function ExerciseView(props: {
	exercise: PlannedExercise;
	views: TemplateViews;
	celebrationMs: number;
	/** Para `traceGuide`: solo se lee en evaluaciones `trace`. */
	run: SessionRun;
}) {
	const { exercise, views, celebrationMs, run } = props;
	const audio = useAudio();
	const presentationDone = useApp((s) => s.presentationDone);
	const answer = useApp((s) => s.answer);
	const answerTrace = useApp((s) => s.answerTrace);
	const answerSpeech = useApp((s) => s.answerSpeech);
	const next = useApp((s) => s.next);
	const item = curriculum.items.get(exercise.itemId);
	// P8: el dato del contenido decide, no la vista. En una evaluación de voz oír el ítem es
	// darle la respuesta al niño.
	const porVoz =
		exercise.kind === "evaluation" &&
		templates[exercise.templateId].evaluation === "voice";

	const [attemptKey, setAttemptKey] = useState(0);
	const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
	const [locked, setLocked] = useState(false);
	const [celebrating, setCelebrating] = useState(false);
	// Un ref y no el estado: dos toques en el mismo instante ven el mismo `locked`.
	const busy = useRef(false);
	const modelPending = useRef(false);
	const alive = useRef(true);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);

	/** El sonido acompaña, no manda: si falla o no suena, la sesión sigue. */
	async function sonar(key: string) {
		try {
			await audio.play({ key });
		} catch {
			// Sin voz también se puede jugar.
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: efecto de montaje
	useEffect(() => {
		if (exercise.kind === "evaluation") {
			void sonar(`instruction:${exercise.templateId}`);
			// Un repaso no tiene presentación: sin oír la palabra el niño le pondría nombre al
			// dibujo («balón» o «pelota») y fallaría el primer intento. La cola ordena las dos.
			// En voz no: la instrucción sola, el niño dice lo que ve (P8).
			if (item !== undefined && !porVoz) void sonar(item.audioKey);
		}
		// Solo al montar el ejercicio: un reintento no repite ni la instrucción ni la palabra.
	}, []);

	/**
	 * Lo que hoy hacen `answer`, `answerTrace` y `answerSpeech` en cuanto el motor ya ha respondido: el mismo
	 * paso a pista, modelo o celebración, sea cual sea la plantilla. `llamar` es `() =>
	 * answer(a)`, `() => answerTrace(trazos)` o `() => answerSpeech(v)`.
	 */
	async function resolver(llamar: () => Promise<AttemptFeedback>) {
		const fb = await llamar();
		if (!alive.current) return;
		const resolucion = fb.resolution;
		if (resolucion === null) {
			// Fallo con pista: el único sonido de fallo, y luego la Evaluation ejecuta la pista.
			await sonar("feedback:retry");
			if (!alive.current) return;
			setFeedback(fb);
			setAttemptKey((k) => k + 1);
			setLocked(false);
			busy.current = false;
		} else if (resolucion.status === "assisted") {
			// El modelo lo completa el niño; hasta `onModelDone` no se avanza ni se acepta
			// otra respuesta (`busy` sigue puesto), pero sus toques sobre el modelo sí valen.
			modelPending.current = true;
			setFeedback(fb);
			setLocked(false);
		} else {
			setFeedback(fb);
			setCelebrating(true);
			await Promise.all([sonar("celebrate:correct"), pausa(celebrationMs)]);
			if (!alive.current) return;
			next();
		}
	}

	if (item === undefined) return null;

	if (exercise.kind === "presentation") {
		return (
			<views.Presentation
				exercise={exercise}
				item={item}
				onDone={() => {
					if (busy.current) return;
					busy.current = true;
					void presentationDone();
				}}
			/>
		);
	}

	return (
		<div
			data-celebrating={celebrating ? "true" : undefined}
			className={celebrating ? "motion-safe:animate-bounce" : undefined}
		>
			<views.Evaluation
				exercise={exercise}
				item={item}
				attemptKey={attemptKey}
				feedback={feedback}
				locked={locked}
				onAnswer={(a) => {
					if (busy.current) return;
					busy.current = true;
					setLocked(true);
					void resolver(() => answer(a));
				}}
				onModelDone={() => {
					if (!modelPending.current) return;
					modelPending.current = false;
					next();
				}}
				{...(porVoz
					? {
							speech: {
								onVerdict: (v: SpokenVerdict) => {
									if (busy.current) return;
									busy.current = true;
									setLocked(true);
									void resolver(() => answerSpeech(v));
								},
							},
						}
					: {})}
				{...(exercise.templateId === "trace"
					? {
							trace: {
								guide: traceGuide(curriculum, run),
								onTrace: (trazos: TraceStroke[]) => {
									if (busy.current) return;
									busy.current = true;
									setLocked(true);
									void resolver(() => answerTrace(trazos));
								},
							},
						}
					: {})}
			/>
		</div>
	);
}

/**
 * La pantalla de la sesión. Obedece al store: pinta el ejercicio en curso con la vista de su
 * plantilla, le pasa lo que el motor ha respondido y devuelve los eventos. No decide nada de
 * pedagogía. Cuando la corrida termina cierra la sesión y avisa con `onEnd`.
 */
export function SessionScreen(props: {
	onEnd: () => void;
	onExit: () => void;
	/** Las vistas de plantilla; los tests inyectan las suyas. */
	views?: Views;
	celebrationMs?: number;
}) {
	const {
		onEnd,
		onExit,
		views = templateViews,
		celebrationMs = CELEBRATION_MS,
	} = props;
	const run = useApp((s) => s.run);
	const endSession = useApp((s) => s.endSession);
	const abandonSession = useApp((s) => s.abandonSession);
	const audio = useAudio();
	const ending = useRef(false);

	const exercise = run === null ? null : currentExercise(run);
	const view = exercise === null ? undefined : views[exercise.templateId];
	const jugable =
		exercise !== null &&
		view !== undefined &&
		curriculum.items.has(exercise.itemId);
	const vacia = run !== null && run.exercises.length === 0;
	const terminada = run !== null && isSessionOver(run);
	const sinVista = exercise !== null && !jugable;

	function salir() {
		audio.stop();
		abandonSession();
		onExit();
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: solo reacciona al estado de la corrida
	useEffect(() => {
		if (run === null) return;
		// Una corrida vacía o con una plantilla que no se sabe pintar no llega al niño.
		if (vacia || sinVista) {
			salir();
			return;
		}
		if (terminada && !ending.current) {
			ending.current = true;
			// Si cerrar falla no se deja la pantalla en blanco: se sale al mapa.
			void endSession().then(onEnd, salir);
		}
	}, [run, vacia, sinVista, terminada]);

	if (run === null || exercise === null || view === undefined || !jugable)
		return null;

	return (
		<main data-screen="session" className="flex min-h-screen flex-col">
			<header className="flex items-center gap-4 p-4">
				<Progreso cursor={run.cursor} total={run.exercises.length} />
				<SalirAdulto onLongPress={salir} />
			</header>
			<div className="flex flex-1 items-center justify-center p-4">
				<ExerciseView
					key={exercise.id}
					exercise={exercise}
					views={view}
					celebrationMs={celebrationMs}
					run={run}
				/>
			</div>
		</main>
	);
}
