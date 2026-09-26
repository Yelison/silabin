"use client";

import { useEffect, useRef, useState } from "react";
import { useLongPress } from "@/components/use-long-press";
import {
	type AttemptFeedback,
	currentExercise,
	curriculum,
	isSessionOver,
	type PlannedExercise,
	type TemplateId,
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
			className="h-12 w-12 shrink-0 rounded-full bg-gray-100 text-xl text-gray-400"
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
			className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200"
		>
			<div
				className="h-full rounded-full bg-amber-400 transition-[width]"
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
}) {
	const { exercise, views, celebrationMs } = props;
	const audio = useAudio();
	const presentationDone = useApp((s) => s.presentationDone);
	const answer = useApp((s) => s.answer);
	const next = useApp((s) => s.next);
	const item = curriculum.items.get(exercise.itemId);

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
			if (item !== undefined) void sonar(item.audioKey);
		}
		// Solo al montar el ejercicio: un reintento no repite ni la instrucción ni la palabra.
	}, []);

	async function resolver(respuesta: string) {
		const fb = await answer(respuesta);
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
					void resolver(a);
				}}
				onModelDone={() => {
					if (!modelPending.current) return;
					modelPending.current = false;
					next();
				}}
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
				/>
			</div>
		</main>
	);
}
