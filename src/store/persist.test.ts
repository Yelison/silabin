import { del, get, set } from "idb-keyval";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createIdbAdapter,
	createMemoryAdapter,
	exportState,
	importState,
	loadState,
	STORAGE_KEY,
	type StorageAdapter,
	saveState,
} from "@/store/persist";
import { emptyPersistedState, type PersistedState } from "@/store/schema";

vi.mock("idb-keyval", () => ({
	get: vi.fn(),
	set: vi.fn(),
	del: vi.fn(),
}));

describe("STORAGE_KEY", () => {
	it("es la clave exacta acordada, porque cambiarla abandona lo ya guardado", () => {
		expect(STORAGE_KEY).toBe("silabin.state.v1");
	});
});

describe("loadState", () => {
	it("devuelve el estado vacío cuando no hay nada guardado", async () => {
		const { state, recovered } = await loadState(createMemoryAdapter());
		expect(state).toEqual(emptyPersistedState());
		expect(recovered).toBe(false);
	});

	it("devuelve lo guardado si es válido", async () => {
		const guardado = emptyPersistedState();
		guardado.units["phase1:vowel-a"] = { status: "done", bestStars: 3 };
		const { state, recovered } = await loadState(createMemoryAdapter(guardado));
		expect(state.units["phase1:vowel-a"]?.bestStars).toBe(3);
		expect(recovered).toBe(false);
	});

	it("trata la ausencia como undefined, que es lo que devuelve IndexedDB la primera vez", async () => {
		const vacio: StorageAdapter = {
			read: () => Promise.resolve(undefined),
			write: () => Promise.resolve(),
			clear: () => Promise.resolve(),
		};
		const { state, recovered } = await loadState(vacio);
		expect(state).toEqual(emptyPersistedState());
		expect(recovered).toBe(false);
	});

	it("recupera con estado vacío si lo guardado está corrupto", async () => {
		const { state, recovered } = await loadState(
			createMemoryAdapter({ version: 1, basura: true }),
		);
		expect(state).toEqual(emptyPersistedState());
		expect(recovered).toBe(true);
	});

	it("recupera si el almacenamiento lanza, como en una ventana privada", async () => {
		const roto: StorageAdapter = {
			read: () => Promise.reject(new Error("sin acceso")),
			write: () => Promise.resolve(),
			clear: () => Promise.resolve(),
		};
		const { state, recovered } = await loadState(roto);
		expect(state).toEqual(emptyPersistedState());
		expect(recovered).toBe(true);
	});

	it("marca readFailed solo cuando la lectura lanza, no cuando el documento es inválido ni cuando no hay nada", async () => {
		const roto: StorageAdapter = {
			read: () =>
				Promise.reject(new Error("Connection to Indexed Database server lost")),
			write: () => Promise.resolve(),
			clear: () => Promise.resolve(),
		};
		const lanza = await loadState(roto);
		expect(lanza.state).toEqual(emptyPersistedState());
		expect(lanza.recovered).toBe(true);
		expect(lanza.readFailed).toBe(true);

		const vacio = await loadState(createMemoryAdapter());
		expect(vacio.readFailed).toBe(false);

		// Un documento inválido no deja en el disco nada bueno que proteger: se puede escribir.
		const invalido = await loadState(
			createMemoryAdapter({ version: 1, basura: true }),
		);
		expect(invalido.recovered).toBe(true);
		expect(invalido.readFailed).toBe(false);

		const valido = await loadState(createMemoryAdapter(emptyPersistedState()));
		expect(valido.readFailed).toBe(false);
	});
});

describe("saveState", () => {
	it("guarda y vuelve a leer sin perder nada", async () => {
		const adapter = createMemoryAdapter();
		const state = emptyPersistedState();
		state.counters.sessions = 4;
		state.sessions.push({
			index: 0,
			unitId: "phase1:vowel-a",
			stars: 2,
			endedAt: "2026-09-18T12:00:00.000Z",
		});
		expect(await saveState(adapter, state)).toEqual({ saved: true });
		const leido = await loadState(adapter);
		expect(leido.state).toEqual(state);
	});

	it("se niega a guardar un documento inválido", async () => {
		const adapter = createMemoryAdapter();
		const roto = { ...emptyPersistedState(), sessionCounter: -5 };
		await expect(saveState(adapter, roto)).rejects.toThrow(/inválido/i);
	});

	it("no escribe nada en el adaptador cuando el documento es inválido", async () => {
		let escrituras = 0;
		const adapter: StorageAdapter = {
			read: () => Promise.resolve(null),
			write: () => {
				escrituras += 1;
				return Promise.resolve();
			},
			clear: () => Promise.resolve(),
		};
		const roto = { ...emptyPersistedState(), sessionCounter: -5 };
		await expect(saveState(adapter, roto)).rejects.toThrow();
		expect(escrituras).toBe(0);
	});

	it("avisa con saved en false cuando el almacenamiento falla, y no lanza", async () => {
		// Tumbar la sesión de juego por un fallo de escritura sería peor que el fallo, pero
		// callárselo también: quien llama tiene que poder avisar al adulto de que el progreso
		// del niño no se guardó.
		const soloLectura: StorageAdapter = {
			read: () => Promise.resolve(null),
			write: () => Promise.reject(new Error("cuota agotada")),
			clear: () => Promise.resolve(),
		};
		await expect(
			saveState(soloLectura, emptyPersistedState()),
		).resolves.toEqual({ saved: false });
	});

	it("confirma con saved en true cuando la escritura sale bien", async () => {
		await expect(
			saveState(createMemoryAdapter(), emptyPersistedState()),
		).resolves.toEqual({ saved: true });
	});
});

describe("createMemoryAdapter", () => {
	it("clear() borra lo guardado; una lectura posterior no ve nada", async () => {
		const adapter = createMemoryAdapter({
			version: 1,
			marca: "antes-de-borrar",
		});
		await adapter.clear();
		await expect(adapter.read()).resolves.toBeNull();
	});
});

describe("createIdbAdapter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("read() llama a get con STORAGE_KEY y devuelve lo que idb-keyval resuelve", async () => {
		vi.mocked(get).mockResolvedValue({ version: 1, marca: "desde-idb" });
		const adapter = createIdbAdapter();
		await expect(adapter.read()).resolves.toEqual({
			version: 1,
			marca: "desde-idb",
		});
		expect(get).toHaveBeenCalledWith(STORAGE_KEY);
	});

	it("write() llama a set con STORAGE_KEY y el valor a guardar", async () => {
		vi.mocked(set).mockResolvedValue(undefined);
		const adapter = createIdbAdapter();
		const valor = { version: 1, marca: "para-guardar" };
		await adapter.write(valor);
		expect(set).toHaveBeenCalledWith(STORAGE_KEY, valor);
	});

	it("clear() llama a del con STORAGE_KEY", async () => {
		vi.mocked(del).mockResolvedValue(undefined);
		const adapter = createIdbAdapter();
		await adapter.clear();
		expect(del).toHaveBeenCalledWith(STORAGE_KEY);
	});
});

/**
 * Documento con TODOS los campos de PersistedState en un valor distinto del que
 * devuelve emptyPersistedState(), y cada sub-campo distinguible de los demás
 * (contadores y cosméticos no comparten valor entre sí). Es un objeto literal
 * completo, no un spread sobre emptyPersistedState(): si PersistedState gana un
 * campo nuevo, este archivo deja de compilar hasta que alguien le dé aquí un
 * valor no-default, en vez de heredarlo en silencio del estado vacío.
 */
function estadoConTodoElProgreso(): PersistedState {
	return {
		version: 1,
		settings: {
			accent: "mx",
			lowercaseTracing: true,
			sessionLength: 6,
			speechMode: "auto",
			reducedCelebrations: true,
			hideMic: true,
			childName: "Sofía",
			pinHash: "hash-de-prueba",
		},
		items: {
			"phase1:vowel-a": {
				box: 3,
				presented: true,
				firstTryCorrect: 5,
				assisted: 1,
				lastSessionIndex: 7,
				lastCreditSession: 6,
				masteredAt: "2026-09-10T08:00:00.000Z",
			},
			"phase1:vowel-e": {
				box: 1,
				presented: true,
				firstTryCorrect: 2,
				assisted: 0,
				lastSessionIndex: 3,
				lastCreditSession: null,
				masteredAt: null,
			},
		},
		units: {
			"phase1:vowel-a": { status: "done", bestStars: 3 },
			"phase1:vowel-e": { status: "active", bestStars: 1 },
			"phase2:m": { status: "locked", bestStars: 0 },
		},
		sessionCounter: 9,
		counters: {
			traces: 4,
			sessions: 9,
			voiceOk: 2,
			wordsRead: 6,
			syllablesVoiced: 5,
		},
		sessions: [
			{
				index: 0,
				unitId: "phase1:vowel-a",
				stars: 3,
				endedAt: "2026-09-01T12:00:00.000Z",
			},
			{
				index: 1,
				unitId: "phase1:vowel-e",
				stars: 1,
				endedAt: "2026-09-02T12:00:00.000Z",
			},
		],
		rewards: {
			unlockedAt: {
				"first-session": "2026-09-01T12:00:00.000Z",
				"phase1-done": "2026-09-10T08:00:00.000Z",
			},
			equipped: { background: "jungla", companion: "loro", trail: "estrellas" },
		},
	};
}

describe("exportar e importar", () => {
	it("un ciclo completo conserva el progreso, con todo el documento en valores no default", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta).toEqual(estado);
	});

	it("el ciclo conserva items con su caja, aciertos y fecha de dominio reales", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.items).toEqual(estado.items);
	});

	it("el ciclo conserva el historial de sesiones", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.sessions).toEqual(estado.sessions);
	});

	it("el ciclo conserva los contadores", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.counters).toEqual(estado.counters);
	});

	it("el ciclo conserva las unidades desbloqueadas y sus estrellas", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.units).toEqual(estado.units);
	});

	it("el ciclo conserva los ajustes cuando no están en su valor por defecto", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.settings).toEqual(estado.settings);
	});

	it("el ciclo conserva las recompensas desbloqueadas y los cosméticos equipados", () => {
		const estado = estadoConTodoElProgreso();
		const { state: vuelta, recovered } = importState(exportState(estado));
		expect(recovered).toBe(false);
		expect(vuelta.rewards).toEqual(estado.rewards);
	});

	it("exportState serializa el documento completo, sin recortar ninguna sección", () => {
		const estado = estadoConTodoElProgreso();
		expect(JSON.parse(exportState(estado))).toEqual(estado);
	});

	it("exporta JSON legible por una persona", () => {
		expect(exportState(emptyPersistedState())).toContain("\n");
	});

	it("importar basura recupera con estado vacío en vez de lanzar", () => {
		expect(importState("esto no es json").recovered).toBe(true);
		expect(importState('{"version":1}').recovered).toBe(true);
	});
});
