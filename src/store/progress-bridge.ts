import type { CurriculumIndex } from "@/content/index";
import {
	type ProgressState,
	recomputeUnitStatuses,
	type SessionLogEntry,
} from "@/engine";
import type { PersistedState } from "@/store/schema";

/**
 * El progreso que entiende el motor, sacado del documento guardado.
 *
 * Las unidades se recalculan siempre: un documento puede traer estados desfasados (por
 * ejemplo, unidades vacías de la Fase 3 marcadas `done` por un fallo ya corregido) y la
 * interfaz no debe pintar lo que el disco diga sin pasar antes por el motor.
 */
export function toProgress(
	doc: PersistedState,
	content: CurriculumIndex,
): ProgressState {
	const progress: ProgressState = {
		items: doc.items,
		units: doc.units,
		sessionCounter: doc.sessionCounter,
		counters: doc.counters,
	};
	return { ...progress, units: recomputeUnitStatuses(content, progress) };
}

/**
 * Sustituye en el documento los campos de progreso y conserva el resto (`settings`,
 * `sessions`, `rewards`). Se copian los campos uno a uno, sin esparcir `progress`, para que
 * una clave de más en el progreso no acabe guardada en el documento.
 */
export function withProgress(
	doc: PersistedState,
	progress: ProgressState,
): PersistedState {
	return {
		...doc,
		items: progress.items,
		units: progress.units,
		sessionCounter: progress.sessionCounter,
		counters: progress.counters,
	};
}

export function appendSession(
	doc: PersistedState,
	entry: SessionLogEntry,
): PersistedState {
	return { ...doc, sessions: [...doc.sessions, entry] };
}

/** Anota la fecha de los logros nuevos. Un logro ya desbloqueado conserva su fecha original. */
export function unlockRewards(
	doc: PersistedState,
	ids: readonly string[],
	now: string,
): PersistedState {
	const unlockedAt = { ...doc.rewards.unlockedAt };
	for (const id of ids) {
		if (!Object.hasOwn(unlockedAt, id)) unlockedAt[id] = now;
	}
	return { ...doc, rewards: { ...doc.rewards, unlockedAt } };
}
