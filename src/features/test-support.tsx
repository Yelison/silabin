import type { ReactNode } from "react";
import { vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import type { AudioPlayer, AudioRequest } from "@/audio";
import { curriculum, type Item, type PlannedExercise } from "@/engine";
import { AppProviders } from "@/features/app-context";
import type {
	EvaluationProps,
	PresentationProps,
	TemplateViews,
} from "@/features/session/registry";
import {
	type AppState,
	createAppStore,
	createMemoryAdapter,
	type StorageAdapter,
} from "@/store";

/** Un reproductor que solo anota lo que se le pide. Nada suena. */
export function fakeAudio() {
	let unlocked = false;
	const audio = {
		get unlocked() {
			return unlocked;
		},
		unlock: vi.fn(async () => {
			unlocked = true;
		}),
		play: vi.fn(async (_request: AudioRequest) => {}),
		stop: vi.fn(),
		beat: vi.fn(),
	} satisfies AudioPlayer;
	return audio;
}

/** Un adaptador en memoria que falla al escribir mientras `fallo.activo` sea true. */
export function adaptadorQueFalla(initial: unknown = null) {
	const base = createMemoryAdapter(initial);
	const fallo = { activo: false };
	const adapter: StorageAdapter = {
		read: () => base.read(),
		clear: () => base.clear(),
		write: (value) =>
			fallo.activo
				? Promise.reject(new Error("cuota agotada"))
				: base.write(value),
	};
	return { adapter, fallo };
}

export function crearStore(
	adapter: StorageAdapter = createMemoryAdapter(),
): StoreApi<AppState> {
	let reloj = 0;
	return createAppStore({
		adapter,
		content: curriculum,
		now: () => `2026-09-26T12:00:${String(reloj++ % 60).padStart(2, "0")}.000Z`,
		seed: () => 1,
	});
}

export function conProveedores(
	store: StoreApi<AppState>,
	audio: AudioPlayer,
	children: ReactNode,
) {
	return (
		<AppProviders store={store} audio={audio}>
			{children}
		</AppProviders>
	);
}

/** La respuesta que el motor da por buena, para que una vista falsa pueda acertar. */
export function respuestaCorrecta(p: {
	exercise: PlannedExercise;
	item: Item;
}): string {
	const esperada = p.exercise.correctOptionId ?? p.item.task?.answer;
	if (esperada === undefined)
		throw new Error("El ejercicio no tiene respuesta");
	return esperada;
}

/**
 * Vistas de plantilla falsas, para probar la pantalla de sesión sin depender de la plantilla
 * real. La `Evaluation` anota las props de cada pintado en `pintados` y ofrece tres botones:
 * `bien` y `mal` responden, `modelo` avisa de que el niño completó el modelo.
 */
export function vistasFalsas() {
	const pintados: EvaluationProps[] = [];
	const presentaciones: PresentationProps[] = [];
	const views: TemplateViews = {
		Presentation: (p: PresentationProps) => {
			presentaciones.push(p);
			return (
				<button
					type="button"
					data-view="presentation"
					data-exercise={p.exercise.id}
					onClick={p.onDone}
				>
					listo
				</button>
			);
		},
		Evaluation: (p: EvaluationProps) => {
			pintados.push(p);
			return (
				<div data-view="evaluation" data-exercise={p.exercise.id}>
					<button
						type="button"
						aria-label="bien"
						onClick={() => p.onAnswer(respuestaCorrecta(p))}
					/>
					<button
						type="button"
						aria-label="mal"
						onClick={() => p.onAnswer("__respuesta_mala__")}
					/>
					<button type="button" aria-label="modelo" onClick={p.onModelDone} />
				</div>
			);
		},
	};
	return {
		views,
		pintados,
		presentaciones,
		ultimo: () => pintados[pintados.length - 1],
	};
}

const DOMINADO = "2026-09-25T10:00:00.000Z";

/**
 * Un documento guardado como lo dejaría el disco, con todas las unidades anteriores a `hasta`
 * dominadas (`null`: ninguna) y, si hace falta, ítems sueltos de la unidad activa ya dominados
 * (`itemsExtra`), para que el planificador saque ejercicios de sílabas o palabras. Las
 * `settings` que falten las rellena el esquema al cargar (`hideMic` sale `false`).
 */
export function documentoConUnidadesHechas(
	hasta: string | null,
	opciones: { hideMic?: boolean; itemsExtra?: readonly string[] } = {},
) {
	const ids: string[] = [];
	if (hasta !== null)
		for (const unitId of curriculum.unitOrder) {
			if (unitId === hasta) break;
			ids.push(...(curriculum.units.get(unitId)?.introduces ?? []));
		}
	ids.push(...(opciones.itemsExtra ?? []));
	const items: Record<string, unknown> = {};
	for (const id of ids)
		items[id] = {
			box: 1,
			presented: true,
			firstTryCorrect: 3,
			assisted: 0,
			lastSessionIndex: 0,
			lastCreditSession: 0,
			masteredAt: DOMINADO,
		};
	return {
		version: 1,
		settings: {
			accent: "neutro",
			lowercaseTracing: false,
			sessionLength: 5,
			speechMode: "parent",
			reducedCelebrations: false,
			hideMic: opciones.hideMic ?? false,
			childName: null,
			pinHash: null,
		},
		items,
		units: {},
		sessionCounter: ids.length === 0 ? 0 : 1,
		counters: { traces: 0, sessions: 0, voiceOk: 0, wordsRead: 0 },
		sessions: [],
		rewards: {
			unlockedAt: {},
			equipped: { background: null, companion: null, trail: null },
		},
	};
}
