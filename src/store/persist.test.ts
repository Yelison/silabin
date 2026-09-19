import { describe, expect, it } from "vitest";
import {
	createMemoryAdapter,
	exportState,
	importState,
	loadState,
	STORAGE_KEY,
	type StorageAdapter,
	saveState,
} from "@/store/persist";
import { emptyPersistedState } from "@/store/schema";

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
		await saveState(adapter, state);
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

	it("no propaga el error si el almacenamiento falla al escribir", async () => {
		const soloLectura: StorageAdapter = {
			read: () => Promise.resolve(null),
			write: () => Promise.reject(new Error("cuota agotada")),
			clear: () => Promise.resolve(),
		};
		await expect(
			saveState(soloLectura, emptyPersistedState()),
		).resolves.toBeUndefined();
	});
});

describe("exportar e importar", () => {
	it("un ciclo completo conserva el progreso", () => {
		const state = emptyPersistedState();
		state.units["phase2:m"] = { status: "done", bestStars: 3 };
		state.rewards.unlockedAt["first-session"] = "2026-09-18T12:00:00.000Z";
		const { state: vuelta, recovered } = importState(exportState(state));
		expect(recovered).toBe(false);
		expect(vuelta).toEqual(state);
	});

	it("exporta JSON legible por una persona", () => {
		expect(exportState(emptyPersistedState())).toContain("\n");
	});

	it("importar basura recupera con estado vacío en vez de lanzar", () => {
		expect(importState("esto no es json").recovered).toBe(true);
		expect(importState('{"version":1}').recovered).toBe(true);
	});
});
