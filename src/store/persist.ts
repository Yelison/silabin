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

/**
 * Lee el documento guardado. `readFailed` distingue "la lectura lanzó" de "no había nada" o
 * "lo guardado estaba dañado": en el primer caso el disco puede tener un documento bueno que
 * simplemente no se pudo leer ahora, y quien guarde encima lo destruiría. En los otros dos no
 * hay nada bueno que proteger. El estado devuelto es el vacío en ambos, para poder jugar.
 */
export async function loadState(adapter: StorageAdapter): Promise<{
	state: PersistedState;
	recovered: boolean;
	readFailed: boolean;
}> {
	let raw: unknown;
	try {
		raw = await adapter.read();
	} catch {
		// Ventana privada, almacenamiento bloqueado o base de datos inaccesible.
		return {
			state: emptyPersistedState(),
			recovered: true,
			readFailed: true,
		};
	}

	if (raw === null || raw === undefined) {
		return {
			state: emptyPersistedState(),
			recovered: false,
			readFailed: false,
		};
	}
	return { ...migrate(raw), readFailed: false };
}

/**
 * Guarda el documento y dice si lo consiguió.
 *
 * Un fallo de escritura —cuota agotada en un iPad, ventana privada de Safari, datos
 * desalojados por el navegador— no lanza: tumbar la sesión de juego en curso sería peor que
 * el fallo. Pero tampoco se calla, que era el problema de la firma anterior, Promise<void>:
 * ningún llamador podía distinguir "se guardó" de "se perdió el progreso del niño en
 * silencio". Se devuelve un objeto, y no un booleano suelto, para poder añadirle un motivo
 * más adelante sin volver a romper la firma.
 *
 * Sí lanza cuando el documento es inválido, porque eso es un error de programación y no del
 * entorno: hay que verlo en cuanto ocurre, no descubrirlo en un { saved: false }.
 */
export async function saveState(
	adapter: StorageAdapter,
	state: unknown,
): Promise<{ saved: boolean }> {
	const parsed = persistedStateSchema.safeParse(state);
	if (!parsed.success) {
		throw new Error(
			`No se guarda un documento inválido: ${parsed.error.issues[0]?.message ?? "desconocido"}`,
		);
	}

	try {
		await adapter.write(parsed.data);
		return { saved: true };
	} catch {
		return { saved: false };
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
