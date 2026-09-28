import { createStore, type StoreApi } from "zustand/vanilla";
import type { CurriculumIndex } from "@/content/index";
import {
	type AttemptFeedback,
	completePresentation,
	finishSession,
	isSessionOver,
	nextExercise,
	type ProgressState,
	type SessionRun,
	type SessionSummary,
	type SpokenVerdict,
	startSession,
	submitAnswer,
	submitSpeech,
	submitTrace,
	type TraceStroke,
} from "@/engine";
import {
	exportState,
	loadState,
	type StorageAdapter,
	saveState,
} from "@/store/persist";
import {
	appendSession,
	toProgress,
	unlockRewards,
	withProgress,
} from "@/store/progress-bridge";
import { emptyPersistedState, type PersistedState } from "@/store/schema";

export type AppStoreDeps = {
	adapter: StorageAdapter;
	content: CurriculumIndex;
	/** Fecha y hora actuales, en ISO. Se inyecta para que los tests controlen el reloj. */
	now: () => string;
	/** Semilla de cada sesión. Se inyecta para que los tests sean deterministas. */
	seed: () => number;
};

export type AppState = {
	status: "loading" | "ready";
	/** El último documento, guardado o pendiente de guardar. Es la fuente de verdad. */
	doc: PersistedState;
	/** Siempre `toProgress(doc)` fuera de una sesión, y `run.progress` durante una. */
	progress: ProgressState;
	/** `loadState` tuvo que rescatar algo. */
	recovered: boolean;
	/** El último guardado devolvió `saved: false`, o no se intentó por `readFailed`. */
	saveFailed: boolean;
	/**
	 * La lectura inicial lanzó: puede haber un documento bueno en el disco que no se pudo leer.
	 * Mientras esté activa no se escribe nada, para no pisarlo con el documento vacío de la
	 * memoria. Solo `retrySave` la quita, y solo si ahora confirma que no hay nada guardado.
	 */
	readFailed: boolean;
	run: SessionRun | null;
	/** La última sesión terminada, para la pantalla de fin. */
	summary: SessionSummary | null;
	load(): Promise<void>;
	/** Lanza si ya hay una sesión en curso. */
	beginSession(): void;
	presentationDone(): Promise<void>;
	answer(value: string): Promise<AttemptFeedback>;
	answerTrace(strokes: readonly TraceStroke[]): Promise<AttemptFeedback>;
	answerSpeech(verdict: SpokenVerdict): Promise<AttemptFeedback>;
	next(): void;
	/** Lanza, sin tocar el estado, si no hay sesión o todavía no ha terminado. */
	endSession(): Promise<void>;
	/** Salida del adulto: descarta la corrida y conserva lo ya guardado. */
	abandonSession(): void;
	clearSummary(): void;
	retrySave(): Promise<void>;
	exportJson(): string;
};

/**
 * El estado de la aplicación: el documento guardado, el progreso que pinta la interfaz y la
 * sesión en curso. No importa React; la interfaz se suscribe con lo que quiera.
 *
 * La pedagogía vive toda en el motor: aquí solo se encadenan sus funciones puras y se guarda
 * después de cada paso que da crédito. Un fallo de guardado no lanza ni corta la sesión
 * (ver `saveState`): se refleja en `saveFailed` para que la interfaz avise al adulto.
 */
export function createAppStore(deps: AppStoreDeps): StoreApi<AppState> {
	const { adapter, content, now, seed } = deps;
	const initialDoc = emptyPersistedState();

	return createStore<AppState>()((set, get) => {
		/**
		 * Deja `doc` al día antes de esperar al guardado, para que un segundo paso que llegue
		 * mientras tanto parta del documento nuevo y no del anterior.
		 */
		async function guardar(
			doc: PersistedState,
			aparte: Partial<AppState> = {},
		): Promise<void> {
			set({ ...aparte, doc });
			if (get().readFailed) {
				// El disco puede tener un documento bueno que no se pudo leer: escribir el de la
				// memoria lo destruiría. El niño sigue en memoria y el adulto ve el aviso.
				set({ saveFailed: true });
				return;
			}
			const { saved } = await saveState(adapter, doc);
			set({ saveFailed: !saved });
		}

		function corridaEnCurso(): SessionRun {
			const { run } = get();
			if (run === null) throw new Error("No hay ninguna sesión en curso");
			return run;
		}

		return {
			status: "loading",
			doc: initialDoc,
			progress: toProgress(initialDoc, content),
			recovered: false,
			saveFailed: false,
			readFailed: false,
			run: null,
			summary: null,

			async load() {
				const { state, recovered, readFailed } = await loadState(adapter);
				set({
					status: "ready",
					doc: state,
					progress: toProgress(state, content),
					recovered,
					readFailed,
				});
			},

			beginSession() {
				if (get().run !== null) throw new Error("Ya hay una sesión en curso");
				const { doc, progress } = get();
				const run = startSession({
					content,
					progress,
					sessionLength: doc.settings.sessionLength,
					seed: seed(),
				});
				set({ run, progress: run.progress });
			},

			async presentationDone() {
				const run = completePresentation(corridaEnCurso());
				set({ run, progress: run.progress });
				await guardar(withProgress(get().doc, run.progress));
			},

			async answer(value) {
				const { run, feedback } = submitAnswer({
					content,
					run: corridaEnCurso(),
					answer: value,
					now: now(),
				});
				set({ run, progress: run.progress });
				if (feedback.resolution !== null)
					await guardar(withProgress(get().doc, run.progress));
				return feedback;
			},

			async answerTrace(strokes) {
				const { run, feedback } = submitTrace({
					content,
					run: corridaEnCurso(),
					strokes,
					now: now(),
				});
				set({ run, progress: run.progress });
				if (feedback.resolution !== null)
					await guardar(withProgress(get().doc, run.progress));
				return feedback;
			},

			async answerSpeech(verdict) {
				const { run, feedback } = submitSpeech({
					content,
					run: corridaEnCurso(),
					verdict,
					now: now(),
				});
				set({ run, progress: run.progress });
				if (feedback.resolution !== null)
					await guardar(withProgress(get().doc, run.progress));
				return feedback;
			},

			next() {
				set({ run: nextExercise(corridaEnCurso()) });
			},

			async endSession() {
				const run = corridaEnCurso();
				if (!isSessionOver(run))
					throw new Error("La sesión todavía no ha terminado");
				const { doc } = get();
				const ahora = now();
				const summary = finishSession({
					content,
					run,
					alreadyUnlocked: Object.keys(doc.rewards.unlockedAt),
					now: ahora,
				});
				const final = appendSession(
					unlockRewards(
						withProgress(doc, summary.progress),
						summary.newRewardIds,
						ahora,
					),
					summary.entry,
				);
				// La corrida se cierra antes de esperar al guardado: si el disco tarda, la
				// interfaz ya puede enseñar el resumen, y una doble pulsación no repite el fin.
				await guardar(final, {
					run: null,
					summary,
					progress: toProgress(final, content),
				});
			},

			abandonSession() {
				// No se toca sessionCounter: la sesión abandonada no cuenta, y la siguiente
				// reutiliza su índice. El motor no da crédito dos veces en un mismo índice
				// (lastCreditSession), así que lo ya guardado se conserva sin duplicarse.
				const { doc } = get();
				set({ run: null, progress: toProgress(doc, content) });
			},

			clearSummary() {
				set({ summary: null });
			},

			async retrySave() {
				if (get().readFailed) {
					let leido: unknown;
					try {
						leido = await adapter.read();
					} catch {
						set({ saveFailed: true });
						return;
					}
					if (leido !== null && leido !== undefined) {
						// Hay un documento real en el disco y en este plan no se fusiona con el de la
						// memoria: se deja tal cual, sin adoptarlo a mitad de sesión.
						set({ saveFailed: true });
						return;
					}
					set({ readFailed: false, recovered: false });
				}
				await guardar(get().doc);
			},

			exportJson() {
				return exportState(get().doc);
			},
		};
	});
}
