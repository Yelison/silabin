import { del, get, set } from "idb-keyval";
import {
	emptyPersistedState,
	migrate,
	type PersistedState,
	persistedStateSchema,
} from "@/store/schema";

export const STORAGE_KEY = "silabin.state.v1";

export type StorageAdapter = {
	read(): Promise<unknown>;
	write(value: unknown): Promise<void>;
	clear(): Promise<void>;
};

/** Adaptador en memoria para los tests y para cuando el navegador no deja guardar. */
export function createMemoryAdapter(initial: unknown = null): StorageAdapter {
	let value = initial;
	return {
		read: () => Promise.resolve(value),
		write: (next) => {
			value = next;
			return Promise.resolve();
		},
		clear: () => {
			value = null;
			return Promise.resolve();
		},
	};
}

/** Adaptador real, sobre IndexedDB. Se cambia por otro (por ejemplo, la nube) sin tocar el resto. */
export function createIdbAdapter(): StorageAdapter {
	return {
		read: () => get(STORAGE_KEY),
		write: (value) => set(STORAGE_KEY, value),
		clear: () => del(STORAGE_KEY),
	};
}

export async function loadState(
	adapter: StorageAdapter,
): Promise<{ state: PersistedState; recovered: boolean }> {
	let raw: unknown;
	try {
		raw = await adapter.read();
	} catch {
		// Ventana privada, almacenamiento bloqueado o base de datos inaccesible.
		return { state: emptyPersistedState(), recovered: true };
	}

	if (raw === null || raw === undefined) {
		return { state: emptyPersistedState(), recovered: false };
	}
	return migrate(raw);
}

export async function saveState(
	adapter: StorageAdapter,
	state: unknown,
): Promise<void> {
	const parsed = persistedStateSchema.safeParse(state);
	if (!parsed.success) {
		throw new Error(
			`No se guarda un documento inválido: ${parsed.error.issues[0]?.message ?? "desconocido"}`,
		);
	}

	try {
		await adapter.write(parsed.data);
	} catch {
		// Quedarse sin cuota o sin permiso no debe tumbar la sesión de juego en curso.
	}
}

export function exportState(state: PersistedState): string {
	return JSON.stringify(state, null, 2);
}

export function importState(json: string): {
	state: PersistedState;
	recovered: boolean;
} {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch {
		return { state: emptyPersistedState(), recovered: true };
	}
	return migrate(raw);
}
